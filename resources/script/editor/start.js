"use strict";

import '@fortawesome/fontawesome-free'

import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../css/editor.css'

import 'jquery-ui'
import 'popper.js'

import "regenerator-runtime/runtime.js";
import Ws from '@adonisjs/websocket-client'

import {globalValues, getQueryParams} from './global.js'
import {docker} from './docker.js'
import {editorCode} from './editorCode.js'
import {filestructure, inputSearchFilesListener, createTree, retriveFile} from './filestructure.js'
import {footer} from './footer.js'
import {navbar} from './navbar.js'
import {project, createNewDocker} from './project.js'

import('jquery.fancytree/dist/skin-lion/ui.fancytree.css');
import {createTree as fancyTreeCreate} from 'jquery.fancytree';
import 'jquery.fancytree/dist/modules/jquery.fancytree.childcounter';
import 'jquery-contextmenu/dist/jquery.ui.position.min.js'
import 'jquery-contextmenu/dist/jquery.contextMenu.min.js'
import 'jquery-contextmenu/dist/jquery.contextMenu.min.css'

(function () {
	let ws = null;
  startWs();
  WsNotice();
  initFancyTree();
  fileMenu();
  openProject();
  docker();
  editorCode();
  filestructure();
  project();

  function startWs() {
    console.log('Start Ws');

    ws = Ws().connect();

    ws.on('open', () => {
      subscribeToOutputChannel();
      subscribeToTerminalChannel();
    }) 
  }

  function subscribeToOutputChannel() {
    const infoChannel = ws.subscribe('docker:infoChannel');
    console.log('infoChannel; ', infoChannel);

    infoChannel.on('output', (output) => {
      let addNewData = output + '<br/>' 
      $('#outputData').append(addNewData)
    })
  }

  function subscribeToTerminalChannel() {
    const terminalChannel = ws.subscribe('docker:terminal');
    console.log('terminalChannel: ', terminalChannel);

    terminalChannel.on('terminal', (terminal) => {
      if (globalValues.xterm) {
        globalValues.xterm.write(terminal);
      }
      $('#terminalOutput').append(terminal)
      $('#terminalOutput').scrollTop($('#terminalOutput').prop('scrollHeight'))
    })
  }

  function initFancyTree () {
      globalValues.fancyTree = fancyTreeCreate('#filetree', {
      minExpandLevel: 2,
      autoScroll: true,
      clickFolderMode: 3,
      extensions: ["childcounter"],
      activate: (event, data) => {
        if (!data.node.isFolder()) {
          retriveFile(data.node.key)
        }
      },
      source: [],
      childcounter: {
        deep: true,
        hideZeros: true,
        hideExpanded: true
      },
    })
  }

  function openProject() {
    const projectId = getQueryParams('project', window.location.href)

    $.ajax({
      type: "GET",
      url: "/api/project/getAllFiles",
      data: {
        projectId: projectId
      },
      success: function (data) {
        $('#openProjectDialog').modal('hide');
        globalValues.currentFileTree = data
        globalValues.fancyTree.reload(createTree(data))
        createNewDocker()
      }
    })
  }

  function WsNotice() {
    let ws = Ws().connect();
    let error = false;

    ws.on('open', () => {
      $('<div class="alert alert-success">' +
        '<button type="button" class="close" data-dismiss="alert">' +
        '&times;</button>Connected to Ws</div>').hide().appendTo('#alerts').fadeIn(1000);

      $(".alert").delay(3000).fadeOut(
        "normal",
        function(){
          $(this).alert('close')
        });
      error = false;
    })

    ws.on('error', (event) => {
      if (!error) {
        $('<div class="alert alert-error">' +
          '<button type="button" class="close" data-dismiss="alert">' +
          '&times;</button>Error with connection to WS</div>').hide().appendTo('#alerts').fadeIn(1000);

        $(".alert").delay(3000).fadeOut(
          "normal",
          function(){
            $(this).alert('close')
          });
        error = true;
      }
    })
  }

  function fileMenu() {
    $.contextMenu({
      selector: "#filetree span.fancytree-title",
      zIndex: 1000,
      items: {
        "createDirectory": {
          name: "Create Directory", icon: "copy", callback: function(key, opt) {
            var node = $.ui.fancytree.getNode(opt.$trigger);
            globalValues.postData = {}
            globalValues.postData.fromDirectory = node.key
            $('#createDirectoryModalInput').val('')
            $('#createDirectoryModal').modal('show')
          }
        },
        "createFile": {
          name: "Create file", icon: "copy", callback: function(key, opt) {
            var node = $.ui.fancytree.getNode(opt.$trigger);
            globalValues.postData = {}
            globalValues.postData.fromDirectory = node.key
            $('#createFileModal').modal('show')
          }
        },
        "rename": {
          name: "Rename", icon: "copy", callback: function(key, opt) {
            var node = $.ui.fancytree.getNode(opt.$trigger)
            globalValues.postData = {}
            globalValues.postData.fromDirectory = node.key
            $('#renameModalInput').val(node.key)
            $('#renameModal').modal('show')
          }
        },
        "delete": {
          name: "Delete", icon: "trash", callback: function(key, opt) {
            var node = $.ui.fancytree.getNode(opt.$trigger);
            globalValues.postData = {}
            globalValues.postData.fileOrDirectory = node.key

            let deleteModal = $('#deleteFileDirectoryModal')
            deleteModal.find('.modal-body').text('Delete: ' + node.key)
            deleteModal.modal('show')
          }
        }
      },
      callback: function(itemKey, opt) {
        var node = $.ui.fancytree.getNode(opt.$trigger);
        alert("select " + itemKey + " on " + node);
      }
    });

    $('#createDirectoryModalInput').keypress(function (event) {
      var keycode = (event.keyCode ? event.keyCode : event.which);
      if (keycode == '13') {
        $('#createDirectoryModal').modal('hide')
        globalValues.postData.newDirectory = $('#createDirectoryModalInput').val()
        $.ajax({
          type: 'POST',
          url: '/api/file/createDirectory',
          data: globalValues.postData,
          success: (data) => {
            globalValues.fancyTree.reload(createTree(data))
          }
        })
      }
    });

    $('#createFileModalInput').keypress(function (event) {
      var keycode = (event.keyCode ? event.keyCode : event.which);
      if (keycode == '13') {
        $('#createFileModal').modal('hide')
        globalValues.postData.newFile = $('#createFileModalInput').val()
        $.ajax({
          type: 'POST',
          url: '/api/file/createFile',
          data: globalValues.postData,
          success: (data) => {
            globalValues.fancyTree.reload(createTree(data))
          }
        })
      }
    });

    $('#renameModalInput').keypress(function (event) {
      var keycode = (event.keyCode ? event.keyCode : event.which);
      if (keycode == '13') {
        $('#renameModal').modal('hide')
        globalValues.postData.newName = $('#renameModalInput').val()
        $.ajax({
          type: 'POST',
          url: '/api/file/rename',
          data: globalValues.postData,
          success: (data) => {
            globalValues.fancyTree.reload(createTree(data))
          }
        })
      }
    });

    $('#deleteFileDirectoryModalBtn').on('click', function(e) {
      console.log('delete file: ', globalValues.postData)
      $('#deleteFileDirectoryModal').modal('hide')
      $.ajax({
        type: 'DELETE',
        url: '/api/file/deleteFileDirectory',
        data: globalValues.postData,
        success: (data) => {
          globalValues.fancyTree.reload(createTree(data))
        }
      })
    })
  }
})()




