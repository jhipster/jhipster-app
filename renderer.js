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
const {shell} = require('electron');
const {dialog} = require('electron').remote;

let jhipsterConfig;

function init() {
    ipc.send('get-project-folder');
}

init();

// Admin buttons

function selectProject() {
    let projectFolder = $('#projectFolder').text();
    dialog.showOpenDialog({defaultPath: projectFolder, properties: ['openDirectory']}, function (projectFolder) {
        if (projectFolder != null) {
            ipc.send('set-project-folder', projectFolder);
        }
    })
}

function projectOpen() {
    open('file://' + $('#projectFolder').text());
}

ipc.on('send-jhispter-config', function (event, arg) {
    jhipsterConfig = arg;
    $('#projectFolder').text(jhipsterConfig.projectFolder);
    $("#jhipsterAppVersion").text('JHipster App v.' + jhipsterConfig.jhipsterAppVersion);
    $('#projectName').text(jhipsterConfig.baseName);
    if (jhipsterConfig.jhipsterVersion != '') {
        $('#no-jhipster-project').hide();
        $('#projectJhipsterVersion').text('JHipster v' + jhipsterConfig.jhipsterVersion);
        if (jhipsterConfig.devDatabaseType == 'h2Disk' || jhipsterConfig.devDatabaseType == 'h2Memory') {
            $('#dev-database .fa-play').hide();
            $('#dev-database .fa-stop').hide();
            $('#dev-database .fa-list').hide();
        } else {
            $('#dev-database .fa-external-link').hide();
        }
        if (jhipsterConfig.testFrameworks.indexOf('protractor') > -1) {
            $('#extra-line').hide();
            $('#test-protractor').show();
        } else {
            $('#test-protractor').hide();
            $('#extra-line').show();
        }
        $('#main').show();
    } else {
        $('#main').hide();
        $('#no-jhipster-project').show();
    }
})

function gotoWebsite() {
    open('https://jhipster.github.io');
}

function gotoTwitter() {
    open('https://twitter.com/java_hipster');
}

function gotoGithub() {
    open('https://github.com/jhipster/generator-jhipster');
}

function exit() {
    ipc.send('quit');
}

// Check running apps

setInterval(function() {
    ipc.send('port-running-test', 8080);
    ipc.send('port-running-test', 9000);
    ipc.send('port-running-test', 9090);
    if (jhipsterConfig != undefined && jhipsterConfig.prodDatabaseType != null) {
            if (jhipsterConfig.prodDatabaseType == 'mysql' || jhipsterConfig.prodDatabaseType == 'mariadb') {
            ipc.send('port-running-test', 3306);
        }
        if (jhipsterConfig.prodDatabaseType == 'postgresql') {
            ipc.send('port-running-test', 5432);
        }
        if (jhipsterConfig.prodDatabaseType == 'mongodb') {
            ipc.send('port-running-test', 27017);
        }
        if (jhipsterConfig.prodDatabaseType == 'cassandra') {
            ipc.send('port-running-test', 9042);
        }
    }
}, 1000);

ipc.on('port-running-ok', function (event, port) {
    if (port == 8080) {
        portRunning('dev-server-running');
    } else if (port == 9000) {
        portRunning('dev-client-running');
    } else if (port == 9090) {
        portRunning('prod-server-running');
    } else if (port == 3306 || port == 5432 || port == 27017 || port == 9042) {
        portRunning('prod-database-running');
        if (jhipsterConfig.devDatabaseType != 'h2Disk' && jhipsterConfig.devDatabaseType != 'h2Memory') {
            portRunning('dev-database-running');
        }
    }
});

function portRunning(command) {
    runUI(command);
    $('#' + command).addClass('label label-success');
    $('#' + command).text('ok');
}

ipc.on('port-running-ko', function (event, port) {
    if (port == 8080) {
        portStopped('dev-server-running');
    } else if (port == 9000) {
        portStopped('dev-client-running');
    } else if (port == 9090) {
        portStopped('prod-server-running');
    } else if (port == 3306 || port == 5432 || port == 27017 || port == 9042) {
        portStopped('prod-database-running');
    }
});

function portStopped(command) {
    $('#' + command).removeClass('label label-success');
    $('#' + command).text('');
}

ipc.on('process-stopped', function (event, command) {
    stopUI(command);
});

ipc.on('process-error', function (event, command) {
    $('#' + command +'-run').popover({title: 'Error'});
    $('#' + command +'-run').popover('show');
});

// Hide popovers that are created manually
$('body').on('click', function (e) {
    if ($(e.target).data('toggle') !== 'popover'
        && $(e.target).parents('.popover.in').length === 0) {
        $('[data-toggle="popover"]').popover('hide');
    }
});

// Clean up

function cleanUpRun() {
    run('clean-up');
}

function cleanUpStop() {
    stop('clean-up');
}

function cleanUpLogs() {
    logs('clean-up');
}

// Compilation

function compileRun() {
    run('compile');
}

function compileStop() {
    stop('compile');
}

function compileLogs() {
    logs('compile');
}

// Run server (dev)

function devServerRun() {
    run('dev-server');
}

function devServerStop() {
    stop('dev-server');
}

function devServerLogs() {
    logs('dev-server');
}

function devServerOpen() {
    open('http://127.0.0.1:8080');
}

// Run client (dev)

function devClientRun() {
    run('dev-client');
}

function devClientStop() {
    stop('dev-client');
}

function devClientLogs() {
    logs('dev-client');
}

function devClientOpen() {
    open('http://127.0.0.1:9000');
}

// Run database (dev)

function devDatabaseRun() {
    run('dev-database');
}

function devDatabaseStop() {
    stop('dev-database');
}

function devDatabaseLogs() {
    logs('dev-database');
}

function devDatabaseOpen() {
    open('http://127.0.0.1:8080/h2-console/login.jsp');
}

// Test server

function testServerRun() {
    run('test-server');
}

function testServerStop() {
    stop('test-server');
}

function testServerLogs() {
    logs('test-server');
}
///Users/julien/workspace/tmp/target/surefire-reports
function testServerOpen() {
    open('file://' + $('#projectFolder').text() + '/target/surefire-reports');
}

// Test client (Karma)

function testKarmaRun() {
    run('test-karma');
}

function testKarmaStop() {
    stop('test-karma');
}

function testKarmaLogs() {
    logs('test-karma');
}

// Test client (Protractor)

function testProtractorRun() {
    run('test-protractor');
}

function testProtractorStop() {
    stop('test-protractor');
}

function testProtractorLogs() {
    logs('test-protractor');
}

// Package

function packageRun() {
    run('package');
}

function packageStop() {
    stop('package');
}

function packageLogs() {
    logs('package');
}

// Run server (prod)

function prodServerRun() {
    run('prod-server');
}

function prodServerStop() {
    stop('prod-server');
}

function prodServerLogs() {
    logs('prod-server');
}

function prodServerOpen() {
    open('http://127.0.0.1:9090');
}

// Run database (prod)

function prodDatabaseRun() {
    run('prod-database');
}

function prodDatabaseStop() {
    stop('prod-database');
}

function prodDatabaseLogs() {
    logs('prod-database');
}

// Common functions

function run(command) {
    if ($('#' + command +'-run').hasClass('fa-refresh')) {
        // already running
    } else {
        ipc.send(command + '-run', '');
        runUI(command);
    }
}

function runUI(command) {
    $('#' + command +'-run').removeClass('fa-play');
    $('#' + command +'-run').addClass('fa-refresh fa-spin');
}

function stop(command) {
    ipc.send(command + '-stop', '');
    stopUI(command);
}

function stopUI(command) {
    $('#' + command +'-run').removeClass('fa-refresh fa-spin');
    $('#' + command +'-run').addClass('fa-play');
}

function logs(command) {
    ipc.send(command + '-logs', '');
}

function open(url) {
    shell.openExternal(url)
}
