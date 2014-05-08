/* Copyright (c) 2012-2014 The TagSpaces Authors. All rights reserved.
 * Use of this source code is governed by a AGPL3 license that 
 * can be found in the LICENSE file. */
/* undef: true, unused: false */
/* global define, Mousetrap, Handlebars  */

 define(function(require, exports, module) {
"use strict";
    
    console.log("Loading fileopener...");

    var TSCORE = require("tscore");

    var _openedFilePath;

    var _openedFileProperties;

    var _isFileOpened = false;

    var _tsEditor;

    var generatedTagButtons;

    $.fn.editableform.buttons =
          '<button type="submit" class="btn btn-primary editable-submit" style="margin-left: 8px;"><i class="fa fa-check fa-lg"></i></button>'+
          '<br /><br /><button type="button" class="btn editable-cancel"><i class="fa fa-times fa-lg"></i></button>';

    // If a file is currently opened for editing, this var should be true
    var _isEditMode = false;

    function initUI() {
        $( "#editDocument" )
            .click(function() {
                $("#editDocument").hide();
                $("#saveDocument").show();
                editFile(_openedFilePath);
            });   
            
        $( "#saveDocument" )
            .click(function() {
                saveFile();
            });                   

        $( "#closeOpenedFile" )
            .click(function() {
                closeFile();
            });

        $( "#nextFileButton" )
            .click(function() {
                TSCORE.FileOpener.openFile(TSCORE.PerspectiveManager.getNextFile(_openedFilePath));            
            });

        $( "#prevFileButton" )
            .click(function() {
                TSCORE.FileOpener.openFile(TSCORE.PerspectiveManager.getPrevFile(_openedFilePath));
            });
        
        $( "#closeFile" )
            .click(function() {
                closeFile();
            });

        $( "#reloadFile" )
            .click(function() {
                TSCORE.FileOpener.openFile(_openedFilePath);                     
            });

        $( "#sendFile" )
            .click(function() {
                TSCORE.IO.sendFile(_openedFilePath);
            });
        
        $( "#openFileInNewWindow" )
            .click(function() {
                window.open("file:///"+_openedFilePath);
            });     
        
        $( "#printFile" )
            .click(function() {
                $('iframe').get(0).contentWindow.print();
            });   

        $( "#tagFile" )
            .click( function() {
                TSCORE.PerspectiveManager.clearSelectedFiles();
                TSCORE.selectedFiles.push(_openedFilePath);                     
                TSCORE.showAddTagsDialog();
            });  

        $( "#suggestTagsFile" )
            .click( function() {
                $("tagSuggestionsMenu").dropdown('toggle');
            });       
        
        $( "#renameFile" )
            .click( function() {
                TSCORE.showFileRenameDialog(_openedFilePath);
            });         
        
        $( "#toggleFullWidthButton" )
            .click(function() {
                TSCORE.toggleFullWidth();           
            }); 
        
        $( "#deleteFile" )
            .click( function() {
                TSCORE.showFileDeleteDialog(_openedFilePath);
            });             

        $( "#openNatively" )
            .click( function() {
                TSCORE.IO.openFile(_openedFilePath);
            }); 

        $( "#openDirectory" )
            .click( function() {
                TSCORE.IO.openDirectory(TSCORE.TagUtils.extractParentDirectoryPath(_openedFilePath));
            }); 

        $( "#fullscreenFile" )
            .click(function() {
                var docElm = $("#viewer")[0];
                if (docElm.requestFullscreen) {
                    docElm.requestFullscreen();
                }
                else if (docElm.mozRequestFullScreen) {
                    docElm.mozRequestFullScreen();
                }
                else if (docElm.webkitRequestFullScreen) {
                    docElm.webkitRequestFullScreen();
                }
            }); 
                      
        $( "#openProperties" )
            .click( function() {
                showFilePropertiesDialog();
            }); 
           
    }

    function isFileEdited() {
        return _isEditMode;
    }

    function isFileOpened() {
        return _isFileOpened;
    }

    function setFileOpened(fileOpened) {
        _isFileOpened = fileOpened;
    }

    function getOpenedFilePath() {
        return _openedFilePath;
    }

    function closeFile(forceClose) {
        if(_isEditMode) {
            if(forceClose) {
                cleanViewer();
            } else {
                TSCORE.showConfirmDialog(
                    $.i18n.t("ns.dialogs:closingEditedFileTitleConfirm"),
                    $.i18n.t("ns.dialogs:closingEditedFileContentConfirm"),
                    function() {
                        cleanViewer();
                    }
                );                             
            }

        } else {
            cleanViewer();
        }
    }

    function cleanViewer() {
        // Cleaning the viewer/editor
        document.getElementById("viewer").innerHTML = "";
        TSCORE.FileOpener.setFileOpened(false);
        TSCORE.closeFileViewer();
        _isEditMode = false;
        Mousetrap.unbind(TSCORE.Config.getSaveDocumentKeyBinding());
        Mousetrap.unbind(TSCORE.Config.getCloseViewerKeyBinding());
        Mousetrap.unbind(TSCORE.Config.getReloadDocumentKeyBinding());
        Mousetrap.unbind(TSCORE.Config.getDeleteDocumentKeyBinding());
        Mousetrap.unbind(TSCORE.Config.getPropertiesDocumentKeyBinding());
        Mousetrap.unbind(TSCORE.Config.getPrevDocumentKeyBinding());
        Mousetrap.unbind(TSCORE.Config.getNextDocumentKeyBinding());
    }

    function openFileOnStartup(filePath) {
        TSCORE.Config.setLastOpenedLocation(undefined); // quick and dirty solution, should use flag later
        TSCORE.toggleFullWidth();
        TSCORE.FileOpener.openFile(filePath);
        TSCORE.openLocation(TSCORE.TagUtils.extractContainingDirectoryPath(filePath));
    }

    function openFile(filePath) {
        console.log("Opening file: "+filePath);

        if(filePath === undefined) {
            return false;
        }

        if(TSCORE.FileOpener.isFileEdited()) {
            // TODO use closeFile method
            if(confirm($.i18n.t("ns.dialogs:closingEditedFileConfirm"))) {
                 $("#saveDocument").hide();
                 _isEditMode = false;
            } else {
                return false;   
            }
        }

        _isEditMode = false;

        _openedFilePath = filePath;
        //$("#selectedFilePath").val(_openedFilePath.replace("\\\\","\\"));

        var fileExt = TSCORE.TagUtils.extractFileExtension(filePath);

        // TODO Improve preventing opening of directories
        //if(fileExt.length < 1) {
        //    console.log("Path has no extension, quiting fileopener.");
        //    return false;
        //}

        // Getting the viewer for the file extension/type
        var viewerExt = TSCORE.Config.getFileTypeViewer(fileExt);
        var editorExt = TSCORE.Config.getFileTypeEditor(fileExt);  
        console.log("File Viewer: "+viewerExt+" File Editor: "+editorExt);

        // Handling the edit button depending on existense of an editor
        if(editorExt == false || editorExt == "false" || editorExt === "") {
            $( "#editDocument" ).hide();        
        } else {
            $( "#editDocument" ).show();                
        }
     
        $( "#viewer" ).empty();

        TSCORE.IO.checkAccessFileURLAllowed();

        TSCORE.IO.getFileProperties(filePath.replace("\\\\","\\"));
        
        if(!viewerExt) {
            require([TSCORE.Config.getExtensionPath()+"/viewerText/extension.js"], function(viewer) {
                _tsEditor = viewer;
                _tsEditor.init(filePath, "viewer", true);
            });        
        } else {
            require([TSCORE.Config.getExtensionPath()+"/"+viewerExt+"/extension.js"], function(viewer) {
                _tsEditor = viewer;
                _tsEditor.init(filePath, "viewer", true);
            });
        }

        updateUI();  
        initTagSuggestionMenu(filePath);

        // Clearing file selection on file load and adding the current file path to the selection
        TSCORE.PerspectiveManager.clearSelectedFiles();
        TSCORE.selectedFiles.push(filePath);

        TSCORE.FileOpener.setFileOpened(true);
        TSCORE.openFileViewer();

        // Handling the keybindings
        Mousetrap.unbind(TSCORE.Config.getSaveDocumentKeyBinding());
        Mousetrap.bind(TSCORE.Config.getSaveDocumentKeyBinding(), function() {
            saveFile();
            return false;
        });

        Mousetrap.unbind(TSCORE.Config.getCloseViewerKeyBinding());
        Mousetrap.bind(TSCORE.Config.getCloseViewerKeyBinding(), function() {
            closeFile();
            return false;
        });

        Mousetrap.unbind(TSCORE.Config.getReloadDocumentKeyBinding());
        Mousetrap.bind(TSCORE.Config.getReloadDocumentKeyBinding(), function() {
            reloadFile();
            return false;
        });

        Mousetrap.unbind(TSCORE.Config.getDeleteDocumentKeyBinding());
        Mousetrap.bind(TSCORE.Config.getDeleteDocumentKeyBinding(), function() {
            TSCORE.showFileDeleteDialog(_openedFilePath);
            return false;
        });

        Mousetrap.unbind(TSCORE.Config.getPropertiesDocumentKeyBinding());
        Mousetrap.bind(TSCORE.Config.getPropertiesDocumentKeyBinding(), function() {
            showFilePropertiesDialog();
            return false;
        });

        Mousetrap.unbind(TSCORE.Config.getPrevDocumentKeyBinding());
        Mousetrap.bind(TSCORE.Config.getPrevDocumentKeyBinding(), function() {
            TSCORE.FileOpener.openFile(TSCORE.PerspectiveManager.getPrevFile(_openedFilePath));
            return false;
        });

        Mousetrap.unbind(TSCORE.Config.getNextDocumentKeyBinding());
        Mousetrap.bind(TSCORE.Config.getNextDocumentKeyBinding(), function() {
            TSCORE.FileOpener.openFile(TSCORE.PerspectiveManager.getNextFile(_openedFilePath));
            return false;
        });
    }

    function setFileProperties(fileProperties) {
        _openedFileProperties = fileProperties;            
    }	

    function updateEditorContent(fileContent) {
        console.log("Updating editor"); // with data: "+fileContent);
        _tsEditor.setContent(fileContent);
    }

    // Should return false if no editor found
    function getFileEditor(filePath) {
        var fileExt = TSCORE.TagUtils.extractFileExtension(filePath);

        // Getting the editor for the file extension/type
        var editorExt = TSCORE.Config.getFileTypeEditor(fileExt);
        console.log("File Editor: "+editorExt);
        return editorExt;
    }

    function editFile(filePath) {
        console.log("Editing file: "+filePath);

        $( "#viewer" ).empty();

        var editorExt = getFileEditor(filePath);
        try {
            require([TSCORE.Config.getExtensionPath()+"/"+editorExt+"/extension.js"], function(editr) {
                _tsEditor = editr;
                _tsEditor.init(filePath, "viewer", false);
            });
            _isEditMode = true;
        } catch(ex) {
            console.error("Loading editing extension failed: "+ex);
        }
    }

    function reloadFile() {
        console.log("Reloading current file.");
        TSCORE.FileOpener.openFile(_openedFilePath);
    }

    function saveFile() {
        console.log("Save current file: "+_openedFilePath);
        TSCORE.showConfirmDialog(
                $.i18n.t("ns.dialogs:fileSaveTitleConfirm"),
                $.i18n.t("ns.dialogs:fileSaveContentConfirm"),
                function() {
                    $("#saveDocument").hide();
                    $("#editDocument").show();      
                    var content = _tsEditor.getContent();
                    TSCORE.IO.saveTextFile(_openedFilePath, content);
                    _isEditMode = false;              
                }
            );
    }

    function updateUI() {
        $("#saveDocument").hide();

        // Initialize File Extension
        var fileExtension = TSCORE.TagUtils.extractFileExtension(_openedFilePath);
        $( "#fileExtText" ).text(fileExtension);

        // Initialize File Title Editor
        var title = TSCORE.TagUtils.extractTitle(_openedFilePath);

        var $fileTitle = $("#fileTitle");
        $fileTitle.editable('destroy');
        $fileTitle.text(title);
        $fileTitle.editable({
            type: 'textarea',
            placement: 'bottom',
            title: 'Change Title',
            //mode: 'inline',
            success: function(response, newValue) {
                TSCORE.TagUtils.changeTitle(_openedFilePath,newValue);
            }
        });

        // Generate tag & ext buttons
        // Appending tag buttons
        var tags = TSCORE.TagUtils.extractTags(_openedFilePath);
        var tagString = "";
        tags.forEach(function (value, index) {
            if(index === 0) {
                tagString = value;                 
            } else {
                tagString = tagString + "," +value;                                 
            }
        });
        generatedTagButtons = TSCORE.generateTagButtons(tagString,_openedFilePath);
        $( "#fileTags" ).empty().append(generatedTagButtons);
    
        $( "#tagsContainer" ).droppable({
            greedy: "true",
            accept: ".tagButton",
            hoverClass: "activeRow",
            drop: function( event, ui ) {
                console.log("Tagging file: "+TSCORE.selectedTag+" to "+_openedFilePath);
                TSCORE.TagUtils.addTag([_openedFilePath], [TSCORE.selectedTag]);

                //$(ui.helper).remove();
            }
        });

        // Init Tag Context Menus
        $('#fileTags').on("contextmenu click", ".tagButton", function () {
            TSCORE.hideAllDropDownMenus();

            TSCORE.openTagMenu(this, $(this).attr("tag"), $(this).attr("filepath"));

            TSCORE.showContextMenu("#tagMenu", $(this));
            return false;
        });
    }

    function initTagSuggestionMenu(filePath) {
        var tags = TSCORE.TagUtils.extractTags(filePath);
        var suggTags = TSCORE.TagUtils.suggestTags(filePath);

        var tsMenu = $( "#tagSuggestionsMenu" );
        tsMenu.empty();
        tsMenu.append($('<li>', {
                class: "dropdown-header",
                text: $.i18n.t("ns.common:tagOperations")
            })
            .append('<button type="button" class="close">×</button>')
        );
        tsMenu.append($('<li>').append($('<a>', {
            title: $.i18n.t("ns.common:addRemoveTagsTooltip"),
            filepath: filePath,
            text: " "+$.i18n.t("ns.common:addRemoveTags")
            })
            .prepend("<i class='fa fa-tag'></i>") 
            .click(function() {
                TSCORE.PerspectiveManager.clearSelectedFiles();
                TSCORE.selectedFiles.push(filePath);                     
                TSCORE.showAddTagsDialog();
            })                
        )); 
        tsMenu.append($('<li>', {
                class: "dropdown-header",
                text: $.i18n.t("ns.common:suggestedTags")
            })
        );

        // Add tag suggestion based on the last modified date
        if(_openedFileProperties !== undefined && _openedFileProperties.lmdt !== undefined) {
            suggTags.push(TSCORE.TagUtils.formatDateTime4Tag(_openedFileProperties.lmdt));
            suggTags.push(TSCORE.TagUtils.formatDateTime4Tag(_openedFileProperties.lmdt, true));
        }

        // Adding context menu entries for creating tags according to the suggested tags
        for (var i=0; i < suggTags.length; i++) {
            // Ignoring the tags already assigned to a file
            if(tags.indexOf(suggTags[i]) < 0) {
                tsMenu.append($('<li>', {name: suggTags[i]}).append($('<a>', {})
                    .append($('<button>', {
                        title:  $.i18n.t("ns.common:tagWithTooltip", {tagName: suggTags[i]}),
                        "class":  "btn btn-sm btn-success tagButton",
                        filepath: filePath,
                        tagname: suggTags[i],
                        text: suggTags[i]
                    })
                    .click(function() {
                        var tagName = $(this).attr( "tagname" );
                        var filePath = $(this).attr( "filepath" );
                        console.log("Tag suggestion clicked: "+tagName);
                        TSCORE.TagUtils.writeTagsToFile(filePath, [tagName]);
                        return false;
                    })
                   )));
            }
        }
    }

    // TODO Make file properties dialog accessible from core
    function showFilePropertiesDialog() {
        require([
              "text!templates/FilePropertiesDialog.html"
            ], function(uiTPL) {
                if($("#dialogFileProperties").length < 1) {                
                    var uiTemplate = Handlebars.compile( uiTPL );
                    $('body').append(uiTemplate());    
                }
                $("#filePathProperty").val(_openedFileProperties.path);
                $("#fileSizeProperty").val(_openedFileProperties.size);
                $("#fileLMDTProperty").val(new Date(_openedFileProperties.lmdt));
                var $fileTagsProperty = $("#fileTagsProperty");
                $fileTagsProperty.empty();
                $fileTagsProperty.append(generatedTagButtons);
                $fileTagsProperty.find(".caret").hide(); // hiding the dropdown trigger
                $('#dialogFileProperties').i18n().modal({backdrop: 'static',show: true});
        });
    }
  
    // Public API definition 
    exports.initUI                              = initUI;
    exports.openFile                            = openFile;
    exports.openFileOnStartup                   = openFileOnStartup;
    exports.closeFile                           = closeFile;
    exports.saveFile                            = saveFile;
    exports.isFileOpened						= isFileOpened;
    exports.isFileEdited						= isFileEdited;
    exports.setFileOpened						= setFileOpened;
    exports.getOpenedFilePath                   = getOpenedFilePath;
    exports.updateEditorContent                 = updateEditorContent;
    exports.setFileProperties                   = setFileProperties;
       
});