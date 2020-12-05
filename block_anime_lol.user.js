// ==UserScript==
// @name         Mark messages read
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  delete dem spem
// @author       Pandi
// @updateURL    https://github.com/Pandiora/misc_userscripts/raw/master/block_anime_lol.user.js
// @downloadURL  https://github.com/Pandiora/misc_userscripts/raw/master/block_anime_lol.user.js
// @match        https://mangadex.org/messages/inbox
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    $('#msg_del_button').parent().after(`
<th>
<div class="btn btn-danger" id="msg_mark_button" style="cursor: pointer;">Mark read</div>
</th>
    `);

$(document).ready(function(){
    $('#msg_mark_button').on('click', function(){
        markRead();
    });
});

})();

function markRead(){

    let len = $('#msg_del_form tr').length;
    for(let i=0;i<len;i++){
        if(i==0 || i==(len-1)) continue;
        if($('#msg_del_form tr')[i].getAttribute("style")==null || $('#msg_del_form tr')[i].getAttribute("style")=="") continue;

        // there seem unread messages - let's open em
        var gotcha = $('#msg_del_form tr')[i],
            gotcha = $(gotcha).find('td a')[1].href;
        // check if the message is checked
        var parts = gotcha.split('/');
        var lastSegment = parts.pop() || parts.pop();  // handle potential trailing slash
        var checked = $('#msg_'+lastSegment).is(':checked');
        if(!checked) continue;
        $.get(gotcha, function(){ console.log('Marked read -'+gotcha); });
    }
}