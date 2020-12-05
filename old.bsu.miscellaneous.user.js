// ==UserScript==
// @name         BSU Misc
// @namespace    http://tampermonkey.net/
// @version      0.11
// @description  Battlestaruniverse Misc
// @author       Pandi
// @updateURL    https://github.com/Pandiora/misc_userscripts/raw/master/old.bsu.miscellaneous.user.js
// @downloadURL  https://github.com/Pandiora/misc_userscripts/raw/master/old.bsu.miscellaneous.user.js
// @match        *://universe1.battlestaruniverse.com/*
// @match        *://battlestaruniverse.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.deleteValue
// ==/UserScript==

// C O N F I G
////////////////////////////////////////////////////////////////////////////////////////
const config = {
    debug: 1,                                // 1=console.log() on
    expoType: 6,                             // 1=,2=,3=,4=,5=,6=droids
    mainCoords: [4,66,19],                   // [Gala,System,Position]: '',
    baseUrlUni: 'https://universe1.battlestaruniverse.com/game.php?page=',
    baseUrlPortal: 'https://battlestaruniverse.com/',
    activeAutoExpo: 1,                       // 1=active automated expo (additonal to automated system expo)
    starTransporters: 10000000,              // amount of evolution transporters send to stars
    expoBattleCruisers: 1000000000,          // amount of BC send to hostal expos
};

// C O D E
////////////////////////////////////////////////////////////////////////////////////////

jQuery(document).ready(function(){

    // init bsu
    bsu.init(config);
    bsu.documentFn(window.location.href);


});

// prevent blocking alerts
window.alert = function ( text ) { bsu.lok( 'Page alert: ' + text ); return true; };

// block close/refresh until all tasks are done
window.onbeforeunload = async function(event){

    await bsu.destroyWorker();

    return null;
    /*window.onbeforeunload = async function(event){

        // wait until sending waves is finished
        const done = await waitRunning();
        if(done){

            bsu.lok('before unload triggered');
            return;
        }
        bsu.lok('error with running script');
        };*/
};





const bsu = (() => {


    let curUUID;
    let data;


    const init = (obj) => {
        data = obj;
    };



    const autoStar = async(formData) => {

        // scan button got clicked
        // console.log('clicky');

        const cntstart = $('#countstart'),
              cntfound = $('#countfound');

        let gala = formData || 0;
        let sys = gala == 0 ? 1 : (formData.system < 200) ? formData.system+1 : 1;
            gala = gala == 0 ? 1 : (formData.system < 200) ? formData.galaxy : formData.galaxy+1;

        if(typeof formData === 'undefined'){

            formData = {
                'galaxy': 0,
                'system': 0,
                'apiKey': ''
            };

            formData.apiKey = formData.apiKey || await fetchingData(data.baseUrlUni+'galaxy', 'POST').then(async(res) => {
                return $(res).find('#apiKey').val();
            });
        }

        formData.galaxy = gala;
        formData.system = sys;

        if(formData.galaxy < 7){

            // Pre-apply +1
            $(cntstart).text(parseInt($(cntstart).text())+1);

            return fetchingData(data.baseUrlUni+'galaxy', formData, 'POST').then(async(res) => {

                const ownerDocument = document.implementation.createHTMLDocument('virtual'),
                      starExists = $(res, ownerDocument).find('#dali.btn_galassia2').length;

                if(starExists){
                    await sleep(randu(550,1500));
                    $(cntfound).text(parseInt($(cntfound).text())+1);
                    await sendTransportersToStar(gala, sys);
                }


                return autoStar(formData);
            });
        }

        console.log('done');

    };


    const createWorker = async(ms) => {

        if(ms) lok('Worker already running.');

        // make sure only one tab runs a new worker when another tab gets closed
        const UUID = curUUID || genUUID(),
              sUUID = await GM.getValue('UUIDlist', [UUID]);
        !sUUID.includes(UUID) && GM.setValue('UUIDlist', [...sUUID,...[UUID]]);
        lok('The current UUID is: '+UUID+' curUUID is: '+curUUID+' The UUID list before: '+JSON.stringify(sUUID));

        // test
        const tester = await GM.getValue('UUIDlist');
        lok(' curUUID is: '+curUUID+' UUID List now: '+JSON.stringify(tester));

        // if worker isn't active it is now else recheck with interval
        return await GM.getValue('workerActive', 1)
            .then(async(active)=>{

            await sleep(ms+randu(1,5));
            return (!active || (UUID == sUUID[0])
                    ? [GM.setValue('workerActive', 1),
                       test(),
                       lok('Worker loaded.') ]
                    :  createWorker(5000)
                   );

        });
    };



    const destroyWorker = async(ms) => {

        // remove matching/current UUID from UUID list
        let UUID = await GM.getValue('UUIDlist', null);
        UUID = (UUID) ? UUID.splice(UUID.indexOf(curUUID), 1) : null;

        // only destroy worker if it is running in this tab
        return (UUID && UUID[0] !== curUUID
                ? [GM.setValue('workerActive', 0),
                   GM.setValue('UUIDlist', UUID),
                   lok('Worker unloaded.') ]
                :  lok('Worker running in another tab.')
        );

    };




    const documentFn = (href) => {

        if(!!~href.indexOf('universe1')){
            createWorker(0);

            const nav = $('#res_nav').after(`
            <div id="scanme" style="width: 10%; height: 100%;left: 75%;position: relative;line-height: 40px; margin:0; display: inline;">
             <span style="margin: 0;"><button id="scanmeexe" style="margin: 5px;">Scan Stars</button></span>(<span style="margin:0;" id="countstart">0</span> / <span style="margin:0;" id="countend">1200</span>)
             <span>Found: <span style="margin:0;" id="countfound">0</span></span>
            </div>`)

            $('#scanmeexe').on('click', (e)=>{
                e.preventDefault();
                autoStar();
                return false;
            });

        }

        if(!!~href.indexOf('galaxy')){
            // check if there's a star and append custom action
            if(jQuery('#dali').length <= 0) return;

            const ele = $('a#dali.dali.btn_galassia2.tooltip');
            ele.attr('href', '#');
            ele.on('click', (e)=>{
                e.preventDefault();
                sendTransportersToStar();
                return false;
            });
        }

        if(!!~href.indexOf('buildings')){
            // Add Multi-Destroy Input to tooltips
            jQuery('#tooltip').bind("DOMSubtreeModified",function(){

                // Should fire when a tooltip for destroy cmd is displayed
                if(jQuery('#tooltip tr:last-child input[name=building]').length){

                    const ele = jQuery('#tooltip tr:last-child input[name=building]'),
                          formData = {
                              [ele.prev().attr('name')]: ele.prev().val(),
                              'building': ele.val()
                          };

                    // Append new inputs
                    ele.parent().parent().parent().html(`
                    <td><input id="destroyAmount" name="destroyAmount" type="number" maxlength="2" value="0" /></td>
                    <td><button id="destroySend">Destroy</button></td>
                    `);

                    // Check if destroy-button was clicked
                    jQuery(document).one('click', '#destroySend', function(){
                        const amount = jQuery('#destroyAmount').val();

                        // process if value is greater than 0
                        if(amount > 0) multiDestroy(formData, amount);
                    });
                }
            });
        }

    };



    const lok = (text) => {
        if(!data.debug) return;
        console.log(text);
    };


    const fetchingData = async(url, p, type) => {

        let sendObj = {
            method: type,
            mode: 'cors'
        };

        let formData = new FormData();
        for (let k in p){ formData.append(k, p[k]); }
        if(type == 'POST') sendObj.body = formData;

        const response = await fetch(url, sendObj);
        return await response.text();

    };



    const genUUID = () => {
        // https://gist.github.com/gordonbrander/2230317
        curUUID = '_' + Math.random().toString(36).substr(2, 9);
        return curUUID;
    };



    const multiDestroy = async (formData, amount) => {

        return fetchingData(data.baseUrlUni+'buildings', formData, 'POST').then(async() => {
            amount--;
            if(amount > 0){
                await sleep(randu(5,100));
                return multiDestroy(formData, amount);
            } else { location.reload() };
        });

    };




    const queueFleet = async(setIt) => {

        lok('Started queue fleet');
        // make sure to set to 0 after queue is finished
        if(setIt) GM.setValue('expoAutoActive', 0);


        // prevent multiple executions if multiple tabs are open
        const active = await GM.getValue('expoAutoActive', 0);
        lok('Queue is active: '+active); if(active) return;


        // use a global timer which persists through refreshes
        let sleepTime = await GM.getValue('expoTimer', randu(45000,90000)),
            newTime   = +new Date(),
            oldTime   = await GM.getValue('expoTimestamp', 0);

        !oldTime && [
            GM.setValue('expoTimer', sleepTime),
            GM.setValue('expoTimestamp', newTime),
            oldTime = newTime ];

        await sleep(Math.max(0,(sleepTime-(newTime-oldTime)))); // always >=0, do not spam

        // starting to get serious
        GM.setValue('expoAutoActive', 1);

        let expoCount = await fetchingData(data.baseUrlUni+'fleetTable', [], 'GET');
        expoCount = jQuery(expoCount).find('#ally_content > div div:nth-child(2)').text().match(/\d+/gm).slice(0,2);
        expoCount = expoCount[1]-expoCount[0]; // returns count of waves which could be sent

        lok('Waves to send: '+expoCount);
        if(expoCount <= 0){
            GM.setValue('expoAutoActive', 0);
            GM.setValue('expoTimer', randu(45000,90000));
            GM.setValue('expoTimestamp', +new Date());
            queueFleet(); // I will fucking do it again
            return;
        }

        let fetchData = [
            { 'galaxy': data.mainCoords[0], 'system': data.mainCoords[1], 'planet': data.mainCoords[2], 'type': 1, 'target_mission': 0, 'ship215': data.expoBattleCruisers, 'save_groop': '' },
            { 'galaxy': data.mainCoords[0], 'system': data.mainCoords[1], 'planet': 21, 'type': 1, 'token': '', 'fleet_group': 0, 'target_mission': 0, 'TIMING': '5.568415100487793', 'speed': 10 },
            { 'token': '', 'groupAttackMOD': 0, 'mission': 17, 'metal': 0, 'crystal': 0, 'deuterium': 0, 'staytime': 1, 'sectors': data.expoType, 'maxwave': expoCount }
        ]; // sector 6 is droids

        let token = await fetchingData(data.baseUrlUni+'fleetStep1', fetchData[0], 'POST');
        token = jQuery(token).find('input[name=token]').eq(0).val();

        fetchData[1].token = fetchData[2].token = token; //lok(token);

        await fetchingData(data.baseUrlUni+'fleetStep2', fetchData[1], 'POST');
        await fetchingData(data.baseUrlUni+'fleetStep3', fetchData[2], 'POST').then(e => {
            lok('Done sending expo waves.');
        });

        GM.setValue('expoTimer', randu(45000,90000));
        GM.setValue('expoTimestamp', +new Date());
        return queueFleet(true); // I will fucking do it again

    };



    const sendTransportersToStar = async(galaxy, system) => {

        let g = galaxy || jQuery('#nav_1 input:nth-child(2)').val(),
            s = system || jQuery('#nav_2 input:nth-child(2)').val(),
            eD = [g, s, 22, data.starTransporters],
            fetchData = [
                { 'galaxy': eD[0], 'system': eD[1], 'planet': eD[2], 'type': 1, 'target_mission': 26, 'ship217': eD[3], 'save_groop': '' },
                { 'galaxy': eD[0], 'system': eD[1], 'planet': eD[2], 'type': 1, 'token': '', 'fleet_group': 0, 'target_mission': 0, 'TIMING': '76.99751618766658', 'speed': 10 },
                { 'token': '', 'groupAttackMOD': 0, 'mission': 26, 'metal': 0, 'crystal': 0, 'deuterium': 0, 'staytime': 1 }
            ]
        ;


        let token = await fetchingData(data.baseUrlUni+'fleetStep1', fetchData[0], 'POST');
        token = jQuery(token).find('input[name=token]').eq(0).val();

        fetchData[1].token = fetchData[2].token = token; //lok(token);

        await fetchingData(data.baseUrlUni+'fleetStep2', fetchData[1], 'POST');
        await fetchingData(data.baseUrlUni+'fleetStep3', fetchData[2], 'POST').then(e => {

            // Add text to galaxy view or return result
            if(galaxy){ return e; }
            jQuery('a#dali.dali.btn_galassia2.tooltip').parent().after(`<span>Sende ${data.starTransporters} Transporter zum Special Star</span>`);

        });

    };



    const randu = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1) + min);
    };



    const sleep = async(milliseconds) => {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    };


    const test = () => {

        lok('Worker running');
    };



    const waitRunning = async() => {
        lok('entered waitRunning');
        const active = await GM.getValue('expoAutoActive', 0);
        if(!active) return true;
        await sleep(5000);
        return await waitRunning();
    };



    return {
        createWorker,
        destroyWorker,
        documentFn,
        genUUID,
        init,
        lok,
        multiDestroy,
        queueFleet,
        randu,
        sendTransportersToStar,
        sleep,
        test,
        waitRunning
    };
})();


