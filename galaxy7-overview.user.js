// ==UserScript==
// @name         Galaxy 7 - Overview
// @namespace    http://tampermonkey.net/
// @version      0.26
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
    startGalaxy: 7,
    startSystem: 1,
    amountSystems: 50, // not respecting Top 200
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

/*
Implement nice logging and error modals (use system ones)
Find out when the next scan is needed
Detect starting system on manual (full) update too
*/

// C O D E
////////////////////////////////////////////////////////////////////////////////////////
jQuery(document).ready(function(){

    // init bsu
    bsu.init(config);

});

// M A I N
////////////////////////////////////////////////////////////////////////////////////////
const bsu = (() => {

    const init = async(config) => {

        const userData = await GM.getValue('userData');

        if(typeof userData === 'undefined'){
            let system = await fetchingData(config.baseUrl+'game.php?page=galaxy&galaxy=7&system=1', [], 'GET');
            config.startSystem = parseInt(jQuery('.gal_p3:eq(1)', system).val());

            await GM.setValue('userData', config);
        }

        addButton();
        onClicks();
    };

    const appendDatasets = async() => {

        const captureData = await getFleetStatus(),
              galaxyData  = await GM.getValue('galaData'),
              userData    = await GM.getValue('userData');

        const typeLen = userData.typeDisplay.length;
        const isThisYou = jQuery('.name_palnet:contains("Galaxy7") + span + span').map(function(e){ return this.innerHTML; }).get();
        let dataTables = "";

        if(typeof galaxyData === 'undefined'){
            await getAllGalaDatasets(userData.startGalaxy, userData.startSystem, userData.amountSystems);
            await reloadContent();
            return;
        }

        for(let i=0;i<typeLen;i++){
            const arr = galaxyData.reduce((r, d, y) => d.type == userData.typeDisplay[i] ? (r.push(y), r) : r , []);
            if(arr.length < 1) continue; let pre = "";

            for(let j=0;j<arr.length;j++){

                const obj = galaxyData[arr[j]],
                      occupied = getOwner(obj,captureData,isThisYou),
                      isInFlight = (["Own","Yes","No"].indexOf(occupied) !== -1) ? 'inline-block' : 'none',
                      directSend = [obj.gal, obj.sys, obj.pos, userData.typeDisplay[i]];

                pre += rowTemplate([
                    userData.baseUrl,
                    obj.gal,
                    obj.sys,
                    obj.pos,
                    obj.ally,
                    occupied,
                    directSend,
                    isInFlight
                ]);
            }

            dataTables += columnTemplate([
                userData.typeColors[userData.typeDisplay[i]],
                userData.typeDisplay[i],
                arr.length,
                pre
            ]);
        }

        return dataTables;
    };

    const getOwner = (obj,cd,ity) => {

        const compare = '['+obj.gal+':'+obj.sys+':'+obj.pos+']';
        let occupied = (obj.occ == "Yes" || obj.ally) ? "Yes" : "No";

        if(occupied == "Yes"){

            for(let k=0;k<ity.length;k++){
                if(cd[0][k] === compare) occupied = "Own";
            }

        } else if(occupied == "No"){

            for(let k=0;k<cd[0].length;k++){

                const timeContainer = cd[1][k];

                if(cd[0][k] === compare)
                    occupied = activeFleetTemplate([
                        timeContainer.id,
                        jQuery(timeContainer).data("fleet-end-time"),
                        jQuery(timeContainer).data("fleet-time")
                    ]);
            }

        }

        return occupied;
    };

    const addButton = async() => {
        jQuery('#munu_galaxy + a').attr("href", "#");
        jQuery('#munu_galaxy + a .imgovernuovo').css('opacity', '1');
    };

    const fetchingData = async(url, p, type) => {

        let sendObj = {
            method: type,
            mode: 'cors'
        };

        let formData = new FormData();
        for (let k in p){ formData.append(k, p[k]); }
        if(type == 'POST') sendObj.body = formData;

        let response = await fetch(url, sendObj);
            response = await response.text();
        const oD = document.implementation.createHTMLDocument('virtual');
        return jQuery(response, oD);

    };

    const getAllGalaDatasets = async(gal,sys,amount,userd,gd) => {

        const userData = userd || await GM.getValue('userData'),
              galaxyData  = gd || await GM.getValue('galaData', []),
              results = await getGalaDataset(gal,sys,userData);

        galaxyData.push.apply(galaxyData,results);
        sys++, amount--;

        if(amount > 0){
            return await getAllGalaDatasets(gal, sys, amount, userData, galaxyData);
        } else {
            await GM.setValue('galaData', galaxyData);
        };
    };

    const getGalaDataset = async(gal,sys,userd) => {

        const userData = userd || await GM.getValue('userData'),
              res = await fetchingData(userData.baseUrl+'game.php?page=galaxy&galaxy='+gal+'&system='+sys, [], 'GET'),
              len = jQuery('.gal_user .gal_ico_trash', res).parent().length;
        let rows = [];

        for(let i=0;i<len;i++){
            const ref = jQuery('.gal_user .gal_ico_trash', res).eq(i).parent(),
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

    const getFleetStatus = async() => {

        const userData = await GM.getValue('userData'),
              vDoc = await fetchingData(userData.baseUrl+'game.php?page=overview', [], 'GET'),
              fleets = jQuery(vDoc).find('.holding.ownseizure .ownseizure:last-child').map(function(e){ return this.innerHTML; }).get(),
              timebase = jQuery(vDoc).find('.holding.ownseizure').parent().prev().children('.fleets').map(function(e){ return this; }).get();
        return [fleets,timebase];

    };

    const getSinglePlanet = async(gal,sys,pla) => {

        const galaxyData = await GM.getValue('galaData'),
              sysData = await getGalaDataset(gal,sys),
              alterGalas = galaxyData.map(obj => sysData.find(o => o.sys == obj.sys && o.pos == obj.pos) || obj);
        await GM.setValue('galaData', alterGalas);

    };

    const setUserConfig = async(key) => {

        let userData = await GM.getValue('userData');
        key = lowerFirstLetter(key.replace('save',''));

        if(key === 'typeDisplay'){
            userData[key] = jQuery('#checkboxes input:checked', document).map(function(){ return this.id[6]; }).get();
        } else {
            userData[key] = jQuery('#'+key, document).val();
        }

        if(userData[key].length < 1) return;
        await GM.setValue('userData', userData);
        await reloadContent();
    };


    const showUserConfig = async() => {

        const userData = await GM.getValue('userData'),
              len = userData.typeDisplay.length;

        jQuery('#startSystem', document).val(userData.startSystem);
        jQuery('#battleShipAmount', document).val(userData.battleShipAmount);

        for(let i=0;i<len;i++){
            const ele = jQuery('#select'+userData.typeDisplay[i], document);
            if(ele.length) jQuery(ele).prop('checked', true);
        }
    };


    const onClicks = (targetid) => {

        const clickedElements = [
            '#refresh-results',
            '#saveTypeDisplay',
            '#saveBattleShipAmount',
            '.imgovernuovo',
            '.overSelect',
            '.bsu-direct-fleet',
            '.bsu-refresh',
        ];

        jQuery(document).on('click', clickedElements, async(e) => {

            const comparison = (e.target.className) ? '.'+e.target.className : '#'+e.target.id,
                  eleIndex = clickedElements.indexOf(comparison);

            if(eleIndex === 0){
                const userData = await GM.getValue('userData');
                await getAllGalaDatasets(userData.startGalaxy, userData.startSystem, userData.amountSystems);
                await reloadContent();
            }

            if([1,2].indexOf(eleIndex) >= 0){
                e.preventDefault();
                await setUserConfig(e.target.id);
            }

            if(eleIndex === 3){
                jQuery('#content').empty().append(mainHtmlTemplate());
                jQuery('.fa-spinner').toggle();
                await reloadContent();
            }

            if(eleIndex === 4){
                jQuery('#checkboxes').toggle('visibility');
            }

            if(eleIndex === 5){
                const fD = jQuery(e.target).data('fleet').split(',');
                await sendFleet(fD[0], fD[1], fD[2], fD[3], e);
                await reloadContent();
            }

            if(eleIndex === 6){
                const userData = await GM.getValue('userData');
                let rowSystem = jQuery(e.target).parent().parent().find('>td>a').text().match(/(\d+)/gm);
                await getSinglePlanet(userData.startGalaxy, rowSystem[1], rowSystem[2]);
                await reloadContent();
            }

        });
    };

    const reloadContent = async () => {
        jQuery('.fa-spinner').toggle();

        const dataSets = await appendDatasets();
        jQuery('#wrapper', document).empty().html(dataSets);
        await showUserConfig();

        jQuery('.fa-spinner').toggle();
    };

    const sendFleet = async(gal,sys,pos,type) => {

        const userData = await GM.getValue('userData');

        let fetchData = [
            { 'galaxy': gal, 'system': sys, 'planet': pos, 'type': 1, 'target_mission': 25, 'ship221': userData.battleShipAmount, 'save_groop': '' },
            { 'galaxy': gal, 'system': sys, 'planet': pos, 'type': 1, 'token': '', 'fleet_group': 0, 'target_mission': 25, 'TIMING': '5.568415100487793', 'speed': 10 },
            { 'token': '', 'groupAttackMOD': 0, 'mission': 25, 'metal': 0, 'crystal': 0, 'deuterium': 0, 'staytime': 0 }
        ];

        let token = await fetchingData(userData.baseUrl+'game.php?page=fleetStep1', fetchData[0], 'POST');
        token = jQuery(token).find('input[name=token]').eq(0).val();
        fetchData[1].token = fetchData[2].token = token;

        await fetchingData(userData.baseUrl+'game.php?page=fleetStep2', fetchData[1], 'POST');
        await fetchingData(userData.baseUrl+'game.php?page=fleetStep3', fetchData[2], 'POST').then(res => {
            const txt = jQuery(res).find('.ally_contents').text();
            console.log('If this result is empty, your fleet got send: '+txt);
        });
    };

    const randu = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1) + min);
    };

    const sleep = async(milliseconds) => {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    };

    const lowerFirstLetter = (string) => {
        return string.charAt(0).toLowerCase() + string.slice(1);
    }

    return {
        init,
    };
})();



// H T M L  -  T E M P L A T E S
////////////////////////////////////////////////////////////////////////////////////////
function activeFleetTemplate(data){
return `
<a
href="#"
id="${data[0]}"
data-fleet-end-time="${data[1]}"
data-fleet-time="${data[2]}"
class="bsu-fleet-transit fleets"
></a>
`;
}
function columnTemplate(data){
return `
<table>
  <tr>
    <th colspan="4" style="color: ${data[0]};">Type ${data[1]} (${data[2]})
    </th>
  </tr>
  <tr>
    <th>Position
    </th>
    <th>Ally
    </th>
    <th>Occupied
    </th>
    <th>Actions
    </th>
  </tr>
  ${data[3]}
</table>
`;
}

function rowTemplate(data){
return `
<tr>
  <td>
    <a href="${data[0]}game.php?page=galaxy&galaxy=${data[1]}&system=${data[2]}" target="_blank">[${data[1]}:${data[2]}:${data[3]}]
    </a>
  </td>
  <td>${data[4]}
  </td>
  <td>${data[5]}
  </td>
  <td>
    <a href="#" onclick="OpenPopup('${data[0]}game.php?page=phalanx&galaxy=${data[1]}&system=${data[2]}&planet=${data[3]}&planettype=1', '', 640, 510);" class="bsu-phalanx" title="Phalanx">
    </a>
    <a href="${data[0]}game.php?page=fleetTable&galaxy=${data[1]}&system=${data[2]}&planet=${data[3]}&planettype=1&target_mission=25" target="_blank" class="bsu-fleet" title="Send Fleet" style="display: ${data[7]};">
    </a>
    <a href="#" class="bsu-direct-fleet" title="Send capturing fleet with one click" data-fleet="${data[6]}" style="display: ${data[7]};">
    </a>
    <a href="#" class="bsu-refresh" title="Refresh this dataset">
    </a>
  </td>
</tr>
`;
}

function mainHtmlTemplate(){
return `
<style type="text/css">
@import"https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css";

#wrapper {
height: 100%;
width: 100%;
color: white
}

#bsu-nav {
height: 30px;
padding: 10px
}

button {
height: 27px;
cursor: pointer;
float: left;
background-color: #006598;
border: 1px #00ccff solid;
color: #FFF;
border-radius: 4px;
margin: 0 2px;
font-size: 16px;
box-sizing: border-box;
display: block
}

table {
background-color: #000d20;
float: left;
width: auto !important
}

td,th {
background-color: #091d2e
}

form {
margin-right: 20px
}

table,td,th {
border: 1px solid black
}

table tr:first-child th {
padding: 5px
}

table tr td,table tr th {
padding: 2px 5px;
text-align: left
}

a[class^="bsu-"]:hover {
filter: contrast(0.5);
}

a[class^="bsu-"] {
height: 20px;
width: 20px;
display: inline-block;
background-repeat: no-repeat;
background-position: center center
}

.bsu-phalanx {
background-image: url('https://static.battlestaruniverse.com/media/gamemedia/styles/images/iconav/radar.png')
}

.bsu-fleet {
background-image: url('https://static.battlestaruniverse.com/media/gamemedia/styles/images/iconav/target.png')
}

.bsu-direct-fleet {
background-image: url('https://static.battlestaruniverse.com/media/gamemedia/styles/images/iconav/hangar.png');
}

.bsu-fleet-transit {
background-image: url('https://static.battlestaruniverse.com/media/gamemedia/styles/images/iconav/fleet_fleet.gif');
}

.bsu-refresh {
background-image: url('https://static.battlestaruniverse.com/media/gamemedia/styles/images/iconav/office.png')
}

form #saveTypeDisplay,form #multiselect {
float: right
}

#battleShipAmount,#startSystem,#multiselect {
height: 27px;
font-size: 16px;
font-weight: bold;
border-radius: 4px;
border: 1px solid black;
color: white;
cursor: pointer;
background-color: #091d2e;
box-sizing: border-box
}

#battleShipAmount + button,#startSystem + button {
float: right
}

.selectBox {
height: 100%;
position: relative;
background-color: #091d2e
}

.selectBox select {
width: 100%;
height: 100%;
font-weight: bold;
background-color: #091d2e;
color: white
}

.overSelect {
position: absolute;
left: 0;
right: 0;
top: 0;
bottom: 0
}

#checkboxes {
display: none;
border: 1px #dadada solid;
background-color: #091d2e;
z-index: 1;
position: relative;
color: white
}

#checkboxes label {
display: block
}

#checkboxes label:hover {
background-color: #1e90ff
}

#system {
width: 195px;
float: right
}

#oneill {
width: 330px;
float: right
}

.fleets {
padding: 0 0 0 20px !important;
line-height: 21px !important;
background-position-x: left !important;
width: 45px !important;
}
</style>
<div id="bsu-nav">
<button id="refresh-results" title="Update all results (will take some time)"><i class="fa fa-spinner fa-spin"></i>Update</button>
<form>
<button id="saveTypeDisplay">Save Types</button>
<div id="multiselect">
<div class="selectBox">
<select><option>Select Types</option></select>
<div class="overSelect"></div>
</div>
<div id="checkboxes">
<label for="select1"><input type="checkbox" id="select1" />Type 1</label>
<label for="select2"><input type="checkbox" id="select2" />Type 2</label>
<label for="select3"><input type="checkbox" id="select3" />Type 3</label>
<label for="select4"><input type="checkbox" id="select4" />Type 4</label>
<label for="select5"><input type="checkbox" id="select5" />Type 5</label>
<label for="select6"><input type="checkbox" id="select6" />Type 6</label>
<label for="select7"><input type="checkbox" id="select7" />Type 7</label>
<label for="select8"><input type="checkbox" id="select8" />Type 8</label>
<label for="select9"><input type="checkbox" id="select9" />Type 9</label>
</div>
</div>
</form>
<form id="oneill">
<input id="battleShipAmount" type="number" step="1" min="1" max="1000000000000" />
<button id="saveBattleShipAmount" title="Save amount of Oneill to send for one capture">Save Oneill Amount</button>
</form>
</div>
<div id="wrapper"></div>
`;
};