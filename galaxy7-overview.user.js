// ==UserScript==
// @name         Galaxy 7 - Overview
// @namespace    http://tampermonkey.net/
// @version      0.12
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
        const galaDatasets = await GM.getValue('galaData');
        let dataTables = "";

        for(let i=0;i<typeLen;i++){
            const obj = (galaDatasets || []).filter(x => x.type == data.typeDisplay[i]);
            if(obj.length < 1) continue;
            let pre = `<table><tr><th colspan="4" style="color: ${data.typeColors[data.typeDisplay[i]]};">Type ${data.typeDisplay[i]} (${obj.length})</th></tr><tr><th>Position</th><th>Ally</th><th>Occupied</th><th>Actions</th></tr>`;

            for(let j=0;j<obj.length;j++){
                let occupied = (obj[j].occ == "Yes" || obj[j].ally) ? "Yes" : "No";
                pre += `<tr><td><a href="${data.baseUrl}game.php?page=galaxy&galaxy=${obj[j].gal}&system=${obj[j].sys}" target="_blank">[${obj[j].gal}:${obj[j].sys}:${obj[j].pos}]</a></td><td>${obj[j].ally}</td><td>${occupied}</td><td><a href="#" onclick="OpenPopup('${data.baseUrl}game.php?page=phalanx&galaxy=${obj[j].gal}&system=${obj[j].sys}&planet=${obj[j].pos}&planettype=1', '', 640, 510);" class="bsu-phalanx" title="Phalanx"></a><a href="${data.baseUrl}game.php?page=fleetTable&galaxy=${obj[j].gal}&system=${obj[j].sys}&planet=${obj[j].pos}&planettype=1&target_mission=25" target="_blank" class="bsu-fleet" title="Send Fleet"></a><a href="" target="_blank" class="bsu-refresh" title="Refresh this dataset"></a></td></tr>`;
            }
            dataTables += pre+'</table>';
        }

        return dataTables;
    };

    const addButton = async() => {

        const button = jQuery('#munu_galaxy + a .imgovernuovo');

        jQuery('#munu_galaxy + a').attr("href", "#");
        jQuery(button).css('opacity', '1');
        jQuery(button).on('click', async () => {
            jQuery('#content').empty();
            const datasets = await appendDatasets();
            jQuery('#content').append(mainHtmlTemplate());
            jQuery('#content').append(datasets);
        });
        jQuery(document).on('click', '#refresh-results', async () => {
            galaData = []; jQuery('#wrapper').empty();
            jQuery('.fa-spinner').toggle();
            await getAllGalaDatasets(data.starting_galaxy, data.starting_system, 50);
            jQuery('.fa-spinner').toggle();
            const datasets = await appendDatasets();
            jQuery('#wrapper').append(datasets);
        });

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

    const getGalaDataset = async(gal,sys) => {

        let res = await fetchingData(data.baseUrl+'game.php?page=galaxy&galaxy='+gal+'&system='+sys, [], 'GET');
        const oD = document.implementation.createHTMLDocument('virtual'),
              len = jQuery(res, oD).find('.gal_user .gal_ico_trash').parent().length;
        let rows = [];

        for(let i=0;i<len;i++){
            const ref = jQuery(res, oD).find('.gal_user .gal_ico_trash').eq(i).parent(),
                  att = (jQuery('.gal_player_cont .ico_post', ref).attr('title')) ? 'Yes' : 'No';

            rows.push({
                gal: gal,
                sys: sys,
                pos: parseInt(jQuery('.gal_number', ref).text().replace(/\s+/g,'')),
                occ: att,
                planet: jQuery('.gal_planet_name', ref).text(),
                type: parseInt(jQuery('.gal_player_name span', ref).text().match(/\s\d+(\d)\|/)[1]),
                ally: jQuery('.gal_ally_name a span', ref).text().replace(/\s+/g,''),
            });
        }

        return rows;
    };

    const mainHtmlTemplate = () => {

        const html = `<style type="text/css">@import "https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css";.fa-spinner{display: none;}#wrapper{height: 100%; width: 100%; color: white;box-sizing: border-box;}#bsu-nav{width: 100%; padding: 10px;box-sizing: border-box;}#refresh-results{height: 25px; font-size: 16px; font-weight: bold; background-color: #46f946; border-radius: 4px; border: 1px solid black; color: black; cursor: pointer;}table{background-color: #000d20; float: left;width: auto !important;}td, th{background-color: #091d2e;}table, td, th{border: 1px solid black;}table tr:first-child th{font-size: 20px; padding: 5px;}table tr th, table tr td{padding: 2px 5px; text-align: left;}a[class^="bsu-"]{height: 20px; width: 20px; display: inline-block; background-repeat: no-repeat; background-position: center center;}.bsu-phalanx{background-image: url('https://static.battlestaruniverse.com/media/gamemedia/styles/images/iconav/radar.png');}.bsu-fleet{background-image: url('https://static.battlestaruniverse.com/media/gamemedia/styles/images/iconav/target.png');}.bsu-refresh{background-image: url('https://static.battlestaruniverse.com/media/gamemedia/styles/images/iconav/office.png');}</style><div id="bsu-nav"><button id="refresh-results"><i class="fa fa-spinner fa-spin"></i>Refresh Results</button></div><div id="wrapper"></div>`;
        return html;
    };

    const updateSingleEntry = (coords) => {


    };

    const sendFleet = (coords) => {


    };

    const randu = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1) + min);
    };

    const sleep = async(milliseconds) => {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    };

    return {
        updateSingleEntry,
        addButton,
        init,
    };
})();