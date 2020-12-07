// ==UserScript==
// @name         Galaxy 7 - Overview
// @namespace    http://tampermonkey.net/
// @version      0.22
// @description  Galaxy 7 - Overview
// @author       Pandi
// @updateURL    https://github.com/Pandiora/misc_userscripts/raw/master/galaxy7-overview.user.js
// @downloadURL  https://github.com/Pandiora/misc_userscripts/raw/master/galaxy7-overview.user.js
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
    starting_galaxy: 7,
    starting_system: 51,
    amount_systems: 50,
    battleShipAmount: 1,
    typeColors: {
        1: '#00BFFF',
        2: '#32CD32',
        3: '#32CD32',
        4: '#32CD32',
        5: '#00BFFF',
        6: '#00BFFF',
        7: '#B22222',
        8: '#B22222',
        9: '#B22222',
    },
    typeDisplay: [1,2,3,4,5,6,7,8,9],
    baseUrl: 'https://universe1.battlestaruniverse.com/',
};

// C O D E
////////////////////////////////////////////////////////////////////////////////////////
jQuery(document).ready(function(){

    // init bsu
    bsu.init(config);
    bsu.addButton();
    bsu.onClicks();

});

// M A I N
////////////////////////////////////////////////////////////////////////////////////////
const bsu = (() => {

    let data;
    let galaData = [];


    const init = (obj) => {
        data = obj;
    };

    const appendDatasets = async() => {

        const typeLen = data.typeDisplay.length;
        const isThisYou = jQuery('.name_palnet:contains("Galaxy7") + span + span').map(function(e){ return this.innerHTML; }).get();
        const captureData = await getFleetStatus();
        const isInFlight = captureData[0];
        galaData = await GM.getValue('galaData');
        let dataTables = "";

        for(let i=0;i<typeLen;i++){
            const obj = (galaData || []).filter(x => x.type == data.typeDisplay[i]);
            if(obj.length < 1) continue;
            let pre = `<table><tr><th colspan="4" style="color: ${data.typeColors[data.typeDisplay[i]]};">Type ${data.typeDisplay[i]} (${obj.length})</th></tr><tr><th>Position</th><th>Ally</th><th>Occupied</th><th>Actions</th></tr>`;

            for(let j=0;j<obj.length;j++){
                let occupied = (obj[j].occ == "Yes" || obj[j].ally) ? "Yes" : "No";
                let direct_fleet = [obj[j].gal,obj[j].sys,obj[j].pos,data.typeDisplay[i]];
                if(occupied == "Yes"){
                    for(let k=0;k<isThisYou.length;k++){
                        const compare = '['+obj[j].gal+':'+obj[j].sys+':'+obj[j].pos+']';
                        if(isThisYou[k] === compare) occupied = "Own";
                    }
                } else if(occupied == "No"){
                    for(let k=0;k<isInFlight.length;k++){
                        const timeContainer = captureData[1][k];
                        const compare = '['+obj[j].gal+':'+obj[j].sys+':'+obj[j].pos+']';
                        if(isInFlight[k] === compare) occupied = '<a href="#" id="'+timeContainer.id+'" data-fleet-end-time="'+$(timeContainer).data("fleet-end-time")+'" data-fleet-time="'+$(timeContainer).data("fleet-time")+'" class="bsu-fleet-transit fleets"></a>';
                    }
                }
                pre += `<tr><td><a href="${data.baseUrl}game.php?page=galaxy&galaxy=${obj[j].gal}&system=${obj[j].sys}" target="_blank">[${obj[j].gal}:${obj[j].sys}:${obj[j].pos}]</a></td><td>${obj[j].ally}</td><td>${occupied}</td><td><a href="#" onclick="OpenPopup('${data.baseUrl}game.php?page=phalanx&galaxy=${obj[j].gal}&system=${obj[j].sys}&planet=${obj[j].pos}&planettype=1', '', 640, 510);" class="bsu-phalanx" title="Phalanx"></a><a href="${data.baseUrl}game.php?page=fleetTable&galaxy=${obj[j].gal}&system=${obj[j].sys}&planet=${obj[j].pos}&planettype=1&target_mission=25" target="_blank" class="bsu-fleet" title="Send Fleet"></a><a href="#" class="bsu-direct-fleet" title="Send capturing fleet with one click" data-fleet="${direct_fleet}"></a><a href="" target="_blank" class="bsu-refresh" title="Refresh this dataset"></a></td></tr>`;
            }
            dataTables += pre+'</table>';
        }

        return dataTables;
    };

    const addButton = async() => {
        const button = jQuery('#munu_galaxy + a .imgovernuovo');
        jQuery('#munu_galaxy + a').attr("href", "#");
        jQuery(button).css('opacity', '1');
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

    const getAllGalaDatasets = async(gal,sys,amount) => {
        return getGalaDataset(gal,sys).then(async(res) => {
            galaData.push.apply(galaData,res); sys++, amount--;

            if(amount > 0){
                await sleep(randu(5,100));
                return getAllGalaDatasets(gal, sys, amount);
            } else {
                await GM.setValue('galaData', galaData);
            };
        });

    };

    const getFleetStatus = async() => {
        const res = await fetchingData(data.baseUrl+'game.php?game.php?page=overview', [], 'GET'),
              oD = document.implementation.createHTMLDocument('virtual'),
              fleets = jQuery(res, oD).find('.holding.ownseizure .ownseizure:last-child').map(function(e){ return this.innerHTML; }).get(),
              timebase = jQuery(res, oD).find('.holding.ownseizure').parent().prev().children('.fleets').map(function(e){ return this; }).get();
        return [fleets,timebase];
    };

    const getGalaDataset = async(gal,sys) => {

        let res = await fetchingData(data.baseUrl+'game.php?page=galaxy&galaxy='+gal+'&system='+sys, [], 'GET');
        const oD = document.implementation.createHTMLDocument('virtual'),
              len = jQuery(res, oD).find('.gal_user .gal_ico_trash').parent().length;
        let rows = [];

        for(let i=0;i<len;i++){
            const ref = jQuery(res, oD).find('.gal_user .gal_ico_trash').eq(i).parent(),
                  att = (jQuery('.gal_player_cont .ico_post', ref).attr('title')) ? 'Yes' : 'No';

            rows.push({
                gal: parseInt(gal),
                sys: parseInt(sys),
                pos: parseInt(jQuery('.gal_number', ref).text().replace(/\s+/g,'')),
                occ: att,
                planet: jQuery('.gal_planet_name', ref).text(),
                type: parseInt(jQuery('.gal_player_name span', ref).text().match(/\s\d+(\d)\|/)[1]),
                ally: jQuery('.gal_ally_name a span', ref).text().replace(/\s+/g,''),
            });
        }

        return rows;
    };

    const getSinglePlanet = async(gal,sys,pla) => {

        const sysData = await getGalaDataset(gal,sys),
              alterGalas = galaData.map(obj => sysData.find(o => o.sys == obj.sys && o.pos == obj.pos) || obj);
        await GM.setValue('galaData', alterGalas);

    };

    const getUserConfig = async() => {

        data.starting_system = await GM.getValue('systems', data.starting_system);
        data.battleShipAmount = await GM.getValue('oneills', data.battleShipAmount);
        data.typeDisplay = await GM.getValue('types', data.typeDisplay);

    };

    const setUserConfig = async() => {

        jQuery('#startingSystem', document).val(data.starting_system);
        jQuery('#oneillAmount', document).val(data.battleShipAmount);
        const len = data.typeDisplay.length;
        for(let i=0;i<len;i++){
            if(jQuery('#'+data.typeDisplay[i].repeat(2), document)) jQuery('#'+data.typeDisplay[i].repeat(2), document).prop('checked', true);
        }
    };

    const onClicks = (targetid) => {

        jQuery(document).on('click', async(e) => {
            const targetId = e.target.id;
            const targetClass = e.target.className;

            switch (true) {
                case /refresh-results/.test(targetId):
                    e.preventDefault();
                    galaData = [];
                    jQuery('.fa-spinner').toggle();
                    await getAllGalaDatasets(data.starting_galaxy, data.starting_system, data.amount_systems);
                    await reloadContent();
                    jQuery('.fa-spinner').toggle();
                    break;
                case /overSelect/.test(targetClass):
                    e.preventDefault();
                    jQuery('#checkboxes').toggle('visibility');
                    break;
                case /bsu-direct-fleet/.test(targetClass):
                    e.preventDefault();
                    jQuery('.fa-spinner').toggle();
                    const fleetData = jQuery(e.target).data('fleet').split(',');
                    await sendFleet(fleetData[0], fleetData[1], fleetData[2], fleetData[3]);
                    await reloadContent();
                    jQuery('.fa-spinner').toggle();
                    break;
                case /bsu-refresh/.test(targetClass):
                    e.preventDefault();
                    let rowSystem = jQuery(e.target).parent().parent();
                        rowSystem = jQuery('>td>a', rowSystem).text().match(/(\d+)/gm);
                    jQuery('.fa-spinner').toggle();
                    await getSinglePlanet(data.starting_galaxy, rowSystem[1], rowSystem[2]);
                    await reloadContent();
                    jQuery('.fa-spinner').toggle();
                    break;
                case /saveTypes/.test(targetId):
                    e.preventDefault();
                    const inputTypes = jQuery('#checkboxes input:checked', document).map(function(){ return this.id[0]; }).get();
                    if(inputTypes.length < 1) return;
                    await GM.setValue('types', inputTypes);
                    await reloadContent();
                    break;
                case /saveOneill/.test(targetId):
                    e.preventDefault();
                    const inputOneills = jQuery('#oneillAmount', document).val();
                    if(inputOneills.length < 1) return;
                    await GM.setValue('oneills', inputOneills);
                    break;
                case /saveSystem/.test(targetId):
                    e.preventDefault();
                    const inputSystem = jQuery('#startingSystem', document).val();
                    if(inputSystem.length < 1) return;
                    await GM.setValue('systems', inputSystem);
                    break;
                case /imgovernuovo/.test(targetClass):
                    e.preventDefault();
                    jQuery('#content').empty().append(mainHtmlTemplate());
                    await reloadContent();
                    break;
                default:
                    return true;
                    break;
            }
        });
    };

    const reloadContent = async () => {
        await getUserConfig();
        const dataSets = await appendDatasets();
        jQuery('#wrapper', document).empty().append(dataSets);
        setUserConfig();
    };

    const sendFleet = async(gal,sys,pos,type) => {
        //console.log('['+gal+':'+sys+':'+pos+']-'+type);
        let fetchData = [
            { 'galaxy': gal, 'system': sys, 'planet': pos, 'type': 1, 'target_mission': 25, 'ship221': data.battleShipAmount, 'save_groop': '' },
            { 'galaxy': gal, 'system': sys, 'planet': pos, 'type': 1, 'token': '', 'fleet_group': 0, 'target_mission': 25, 'TIMING': '5.568415100487793', 'speed': 10 },
            { 'token': '', 'groupAttackMOD': 0, 'mission': 25, 'metal': 0, 'crystal': 0, 'deuterium': 0, 'staytime': 0 }
        ];

        let token = await fetchingData(data.baseUrl+'game.php?page=fleetStep1', fetchData[0], 'POST');
        token = jQuery(token).find('input[name=token]').eq(0).val();
        fetchData[1].token = fetchData[2].token = token;

        await fetchingData(data.baseUrl+'game.php?page=fleetStep2', fetchData[1], 'POST');
        await fetchingData(data.baseUrl+'game.php?page=fleetStep3', fetchData[2], 'POST').then(res => {
            const oD = document.implementation.createHTMLDocument('virtual'),
                  txt = jQuery(res, oD).find('.ally_contents').text();
            console.log('If this result is empty, your fleet got send: '+txt);
        });
    };

    const mainHtmlTemplate = () => {
        const html = `
        <style type="text/css">
        @import"https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css";.fa-spinner{display:none}#wrapper{height:100%;width:100%;color:white}#bsu-nav{height:30px;padding:10px}button{height:27px;cursor:pointer;float:left;background-color:#006598;border:1px #00ccff solid;color:#FFF;border-radius:4px;margin:0 2px;font-size:16px;box-sizing:border-box;display:block}table{background-color:#000d20;float:left;width:auto !important}td,th{background-color:#091d2e}form{margin-right:20px}table,td,th{border:1px solid black}table tr:first-child th{padding:5px}table tr td,table tr th{padding:2px 5px;text-align:left}a[class^="bsu-"]:hover{filter: contrast(0.5);}a[class^="bsu-"]{height:20px;width:20px;display:inline-block;background-repeat:no-repeat;background-position:center center}.bsu-phalanx{background-image:url('https://static.battlestaruniverse.com/media/gamemedia/styles/images/iconav/radar.png')}.bsu-fleet{background-image:url('https://static.battlestaruniverse.com/media/gamemedia/styles/images/iconav/target.png')}.bsu-direct-fleet{background-image:url('https://static.battlestaruniverse.com/media/gamemedia/styles/images/iconav/hangar.png');}.bsu-fleet-transit{background-image:url('https://static.battlestaruniverse.com/media/gamemedia/styles/images/iconav/fleet_fleet.gif');}.bsu-refresh{background-image:url('https://static.battlestaruniverse.com/media/gamemedia/styles/images/iconav/office.png')}form #saveTypes,form #multiselect{float:right}#oneillAmount,#startingSystem,#multiselect{height:27px;font-size:16px;font-weight:bold;border-radius:4px;border:1px solid black;color:white;cursor:pointer;background-color:#091d2e;box-sizing:border-box}#oneillAmount + button,#startingSystem + button{float:right}.selectBox{height:100%;position:relative;background-color:#091d2e}.selectBox select{width:100%;height:100%;font-weight:bold;background-color:#091d2e;color:white}.overSelect{position:absolute;left:0;right:0;top:0;bottom:0}#checkboxes{display:none;border:1px #dadada solid;background-color:#091d2e;z-index:1;position:relative;color:white}#checkboxes label{display:block}#checkboxes label:hover{background-color:#1e90ff}#system{width:195px;float:right}#oneill{width:270px;float:right}.fleets{padding: 0 0 0 20px !important;line-height: 21px !important;background-position-x: left !important;width: 45px !important;}
        </style>
        <div id="bsu-nav"> <button id="refresh-results" title="Update all results (will take some time)"><i class="fa fa-spinner fa-spin"></i>Update</button><form> <button id="saveTypes">Save Types</button><div id="multiselect"><div class="selectBox"> <select><option>Select Types</option></select><div class="overSelect"></div></div><div id="checkboxes"> <label for="11"><input type="checkbox" id="11" />Type 1</label> <label for="22"><input type="checkbox" id="22" />Type 2</label> <label for="33"><input type="checkbox" id="33" />Type 3</label> <label for="44"><input type="checkbox" id="44" />Type 4</label> <label for="55"><input type="checkbox" id="55" />Type 5</label> <label for="66"><input type="checkbox" id="66" />Type 6</label> <label for="77"><input type="checkbox" id="77" />Type 7</label> <label for="88"><input type="checkbox" id="88" />Type 8</label> <label for="99"><input type="checkbox" id="99" />Type 9</label></div></div></form><form id="system"> <input id="startingSystem" type="number" step="50" min="1" max="3001"> <button id="saveSystem">Save System</button></form><form id="oneill"> <input id="oneillAmount" type="number" step="1" min="1" max="1000000000000"> <button id="saveOneill">Save Oneill</button></form></div><div id="wrapper"></div>
        `;
        return html;
    };

    const randu = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1) + min);
    };

    const sleep = async(milliseconds) => {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    };

    return {
        addButton,
        onClicks,
        init,
    };
})();