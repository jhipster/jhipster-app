/*

Copyright (c) Julien Dubois - http://www.julien-dubois.com. All Rights Reserved.

This file is part of JHipster-App - https://github.com/jhipster/jhipster-app

JHipster-App is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

JHipster-App is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with JHipster-App.  If not, see <http://www.gnu.org/licenses/>.

*/

'use strict';
const ipc = require('electron').ipcRenderer;
const Tail = require('tail').Tail;
const fs = require('fs');

let containerLogs = $('#containerLogs');

function init() {
    let command = window.location.hash.substring(1);
    if (command == null) {
        command = 'dev-server';
    }
    let windowTitle = 'JHipster logs';
    switch(command) {
        case 'clean-up':
            windowTitle = 'JHipster logs for \'Clean up\' task';
            break;
        case 'dev-server':
            windowTitle = 'JHipster logs for \'Run server (dev)\' task';
            break;
        case 'dev-client':
            windowTitle = 'JHipster logs for \'Run client (dev)\' task';
            break;
        case 'dev-database':
            windowTitle = 'JHipster logs for \'Run database (dev)\' task';
            break;
        case 'test-server':
            windowTitle = 'JHipster logs for \'Test server\' task';
            break;
        case 'test-karma':
            windowTitle = 'JHipster logs for \'Test client (Karma)\' task';
            break;
        case 'test-protractor':
            windowTitle = 'JHipster logs for \'Test client (Protractor)\' task';
            break;
        case 'package':
            windowTitle = 'JHipster logs for \'Package\' task';
            break;
        case 'prod-server':
            windowTitle = 'JHipster logs for \'Run server (prod)\' task';
            break;
        case 'prod-database':
            windowTitle = 'JHipster logs for \'Run database (prod)\' task';
            break;
    }
    document.title = windowTitle;
    let projectFolder = ipc.sendSync('get-project-folder');
    let projectLogFolder = projectFolder + '/logs';
    let logFile = projectLogFolder + '/' + command + '.log';
    let configFile = projectFolder + "/.yo-rc.json";
    if (fs.existsSync(configFile)) {
        if (!fs.existsSync(logFile)) fs.writeFileSync(logFile, "");

        let tail = new Tail(logFile, {fromBeginning: true});

        tail.on('line', function(data) {
            containerLogs.append('<div>' + data + '</div>');

            // limit the log window to 1,000 messages
            if (containerLogs.children().length >= 1000) {
                containerLogs.children().first().remove();
            }
            window.scrollBy(0,50);
        });

        tail.watch();
    }
}

init();
