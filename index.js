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
const electron = require('electron');
const ipc = require('electron').ipcMain;
const {BrowserWindow} = require('electron');
const app = electron.app;
const path = require('path');
const shell = require("shelljs");
const settings = require('electron-settings');
const fs = require('fs');
const tcpPortUsed = require('tcp-port-used');
const fixPath = require('fix-path');
const os = require('os');
const ua = require('universal-analytics');
const uuid = require("node-uuid");
const pjson = require('./package.json');

fixPath();

const menubar = require('menubar')

let mb = menubar({width: 320, height: 500})

let user_id = settings.getSync('jhipster-app.user_id');
if (user_id == undefined) {
    user_id = uuid.v4();
    settings.set('jhipster-app.user_id', user_id);
}
let visitor = ua('UA-46075199-5', user_id, {https: true});
let projectFolder = '';
let buildTool = 'maven';
let buildToolCmd = './mvnw';
let devDatabase = 'h2Disk';
let prodDatabase = 'mysql';

mb.on('ready', function ready () {
    projectFolder = settings.getSync('jhipster-app.project-folder');
    if (projectFolder == undefined) {
        projectFolder = app.getPath('home');
    }
    console.log('JHipster app is ready');
    visitor.pageview("/" + pjson.version + "/" + os.platform()).send();
});

ipc.on('port-running-test', function (event, port) {
    tcpPortUsed.check(port, '127.0.0.1')
        .then(function(inUse) {
            if (inUse) {
                event.sender.send('port-running-ok', port);
            } else {
                event.sender.send('port-running-ko', port);
            }
    });
});

ipc.on('get-project-folder', function (event, arg) {
    projectFolder = settings.getSync('jhipster-app.project-folder');
    if (projectFolder == undefined) {
        projectFolder = app.getPath('home');
    }
    readProjectConfiguration(projectFolder, event);
    event.returnValue = projectFolder;
});

ipc.on('set-project-folder', function (event, arg) {
    projectFolder = arg[0];
    settings.set('jhipster-app.project-folder', projectFolder );
    readProjectConfiguration(projectFolder, event);
});

function readProjectConfiguration(projectFolder, event) {
    console.log('Read project configuration from ' + projectFolder + '/.yo-rc.json');
    fs.readFile(projectFolder + '/.yo-rc.json', 'utf8', function(err, data) {
        let jhipsterConfigError = {
            projectFolder: projectFolder,
            jhipsterVersion: '',
            baseName: 'Not a JHipster project',
            jhipsterAppVersion: pjson.version
        };
        if (err) {
            console.log('error: ' + err);
            event.sender.send('send-jhispter-config', jhipsterConfigError);
        }
        if (data && !err) {
            let jsonObject = JSON.parse(data);
            let jhipsterConfig = jsonObject['generator-jhipster'];
            if (jhipsterConfig == undefined) {
                event.sender.send('send-jhispter-config', jhipsterConfigError);
            } else {
                jhipsterConfig.projectFolder = projectFolder;
                jhipsterConfig.jhipsterAppVersion = pjson.version;
                buildTool = jhipsterConfig.buildTool;
                if (buildTool == 'gradle') {
                    if (os.platform() == 'win32') {
                        buildToolCmd = 'gradlew.bat';
                    } else {
                        buildToolCmd = './gradlew';
                    }
                } else {
                    if (os.platform() == 'win32') {
                        buildToolCmd = 'mvnw.cmd';
                    } else {
                        buildToolCmd = './mvnw';
                    }
                }
                devDatabase = jhipsterConfig.devDatabaseType;
                prodDatabase = jhipsterConfig.prodDatabaseType;

                console.log('Project using JHipster version: ' + jhipsterConfig.jhipsterVersion);
                event.sender.send('send-jhispter-config', jhipsterConfig);
            }
        }
    });
}

ipc.on('quit', function (event, arg) {
    console.log('Exiting JHipster app, goodbye!');
    stop('clean-up', cleanUpProc);
    stop('compile', compileProc);
    stop('dev-server', devServerProc);
    stop('dev-client', devClientProc);
    stop('test-server', testServerProc);
    stop('test-karma', testKarmaProc);
    stop('test-protractor', testProtractorProc);
    stop('package', packageProc);
    stop('prod-server', prodServerProc);
    stop('prod-database', prodDatabaseProc);
    app.quit();
});

// Clean up

let cleanUpProc;

ipc.on('clean-up-run', function (event, arg) {
    cleanUpProc = run(event, 'clean-up', buildToolCmd + ' clean');
});

ipc.on('clean-up-stop', function (event, arg) {
    stop('clean-up', cleanUpProc);
});

ipc.on('clean-up-logs', function (event, arg) {
    logs('clean-up');
});

// Compile

let compileProc;

ipc.on('compile-run', function (event, arg) {
    if (buildTool == 'maven') {
        compileProc = run(event, 'compile', buildToolCmd + ' compile');
    } else if (buildTool == 'gradle') {
        compileProc = run(event, 'compile', buildToolCmd + ' compileJava');
    }
});

ipc.on('compile-stop', function (event, arg) {
    stop('compile', cleanUpProc);
});

ipc.on('compile-logs', function (event, arg) {
    logs('compile');
});

// Run server (dev)

let devServerProc;

ipc.on('dev-server-run', function (event, arg) {
    devServerProc = run(event, 'dev-server', buildToolCmd, {'server.address': '127.0.0.1'});
});

ipc.on('dev-server-stop', function (event, arg) {
    stop('dev-server', devServerProc);
});

ipc.on('dev-server-logs', function (event, arg) {
    logs('dev-server');
});

// Run client (dev)

let devClientProc;

ipc.on('dev-client-run', function (event, arg) {
    devClientProc = run(event, 'dev-client', 'gulp');
});

ipc.on('dev-client-stop', function (event, arg) {
    stop('dev-client', devClientProc);
});

ipc.on('dev-client-logs', function (event, arg) {
    logs('dev-client');
});

// Run database (dev)

let devDatabaseProc;

ipc.on('dev-database-run', function (event, arg) {
    devDatabaseProc = run(event, 'dev-database', 'docker-compose -f src/main/docker/' + devDatabase + '.yml up -d');
});

ipc.on('dev-database-stop', function (event, arg) {
    run(event, 'dev-database', 'docker-compose -f src/main/docker/' + devDatabase + '.yml down');
});

ipc.on('dev-database-logs', function (event, arg) {
    logs('dev-database');
});

// Test server

let testServerProc;

ipc.on('test-server-run', function (event, arg) {
    testServerProc = run(event, 'test-server', buildToolCmd + ' clean test');
});

ipc.on('test-server-stop', function (event, arg) {
    stop('test-server', testServerProc);
});

ipc.on('test-server-logs', function (event, arg) {
    logs('test-server');
});

// Test client (Karma)

let testKarmaProc;

ipc.on('test-karma-run', function (event, arg) {
    testKarmaProc = run(event, 'test-karma', 'gulp test');
});

ipc.on('test-karma-stop', function (event, arg) {
    stop('test-karma', testKarmaProc);
});

ipc.on('test-karma-logs', function (event, arg) {
    logs('test-karma');
});

// Test client (Protractor)

let testProtractorProc;

ipc.on('test-protractor-run', function (event, arg) {
    testProtractorProc = run(event, 'test-protractor', 'gulp itest');
});

ipc.on('test-protractor-stop', function (event, arg) {
    stop('test-protractor', testProtractorProc);
});

ipc.on('test-protractor-logs', function (event, arg) {
    logs('test-protractor');
});

// Package

let packageProc;

ipc.on('package-run', function (event, arg) {
    if (buildTool == 'maven') {
        packageProc = run(event, 'package', buildToolCmd + ' clean package -Pprod');
    } else if (buildTool == 'gradle') {
        packageProc = run(event, 'package', buildToolCmd + ' clean test bootRepackage -Pprod');
    }
});

ipc.on('package-stop', function (event, arg) {
    stop('package', packageProc);
});

ipc.on('package-logs', function (event, arg) {
    logs('package');
});

// Run server (prod)

let prodServerProc;

ipc.on('prod-server-run', function (event, arg) {
    if (buildTool == 'maven') {
        prodServerProc = runInDirectory(event, 'prod-server', 'java -jar *.war', projectFolder + '/target', {'server.address': '127.0.0.1', 'server.port': '9090'});
    } else if (buildTool == 'gradle') {
        prodServerProc = runInDirectory(event, 'prod-server', 'java -jar *.war', projectFolder + '/build/libs', {'server.address': '127.0.0.1', 'server.port': '9090'});
    }
});

ipc.on('prod-server-stop', function (event, arg) {
    stop('prod-server', prodServerProc);
});

ipc.on('prod-server-logs', function (event, arg) {
    logs('prod-server');
});

// Run database (prod)

let prodDatabaseProc;

ipc.on('prod-database-run', function (event, arg) {
    prodDatabaseProc = run(event, 'prod-database', 'docker-compose -f src/main/docker/' + prodDatabase + '.yml up -d');
});

ipc.on('prod-database-stop', function (event, arg) {
    run(event, 'prod-database', 'docker-compose -f src/main/docker/' + prodDatabase + '.yml down');
});

ipc.on('prod-database-logs', function (event, arg) {
    logs('prod-database');
});

// Common functions

function run(event, command, exec, env) {
    return runInDirectory(event, command, exec, projectFolder, env);
}

function runInDirectory(event, command, exec, cwd, env) {
    let projectLogFolder = projectFolder + '/logs';
    let logFile = projectLogFolder + '/' + command + '.log';
    console.log('Running ' + exec + ' on ' + cwd + ' - outputing log to ' + logFile);
    if (!fs.existsSync(projectLogFolder)){
        fs.mkdirSync(projectLogFolder);
    }
    if (fs.existsSync(logFile)) {
        fs.truncate(logFile, 0, function() {
            console.log(logFile + ' is cleaned up');
        })
    }
    let userEnv = process.env;
    for (var k in env) {
        userEnv[k] = env[k];
    }
    let runningProcess = shell.exec(exec, {cwd: cwd, env: userEnv, silent: true}, function(code, stdout, stderr) {
        event.sender.send('process-stopped', command);
        console.log(command + ' has stopped.');
        console.log(stderr);
        if (code != 0 && code != 130) {
            event.sender.send('process-error', command);
        }
    });
    runningProcess.stdout.on('data', function(data) {
        fs.appendFile(logFile, data, function (err) {
        });
    });
    visitor.event("start", command).send();
    return runningProcess;
}

function stop(command, runningProcess) {
    console.log('Killing ' + command);
    if (runningProcess != null) {
        runningProcess.kill('SIGINT');
        visitor.event("stop", command).send();
    }
}

function logs(command) {
    var win = new BrowserWindow({backgroundColor: '#000000', width: 1024, height: 600, title: 'JHipster logs'})
    win.loadURL('file://' + app.getAppPath() + '/logs/logs.html#' + command);
    win.once('ready-to-show', () => {
        visitor.event("log", command).send();
        win.show()
    });
}
