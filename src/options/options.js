// ************************************************************************
// Multi Highlight options js
// ************************************************************************
debugger;
document.addEventListener('DOMContentLoaded', function () {

    chrome.storage.local.get(['settings'], function (result) {
        // init
        var settings = result.settings;
        // set html
        // delimiter.value = settings.delim;
        // instant.checked = settings.isInstant;
        // saveWords.checked = settings.isSaveKws;
        popupHeight.value = settings.popup_height;
        popupWidth.value = settings.popup_width;
        addKw.checked = settings.enableAddKw;
        removeKw.checked = settings.enableRemoveKw;

        // register listener
        // $("#delimiter").on("input", function () {
        //     handle_delimiter_change(null, settings);
        // })
        // $("#instant").on("input", function () {
        //     handle_instant_mode_change(settings);
        // })
        // $("#saveWords").on("input", function () {
        //     handle_saveWords_mode_change(settings);
        // })
        $("#popupHeight").on("input", function () {
            chrome.runtime.sendMessage(
                { // message
                    action: "handle_popupSize_change",
                    newHeight: $(this)[0].value,
                    newWidth: null,
                }
            )
            // console.log("height" + $(this)[0].value);
            // handle_popupSize_change($(this)[0].value, null);
        })
        $("#popupWidth").on("input", function () {
            chrome.runtime.sendMessage(
                { // message
                    action: "handle_popupSize_change",
                    newHeight: null,
                    newWidth: $(this)[0].value,
                }
            )
            // console.log("width" + $(this)[0].value);
            // handle_popupSize_change( null, $(this)[0].value);
        })
        $("#addKw").on("input", function () {
            chrome.runtime.sendMessage(
                { // message
                    action: "handle_addKw_change",
                    enableIt: $(this)[0].checked,
                }
            )
            // console.log($(this)[0].checked);
            // handle_addKw_change($(this)[0].checked);
        })
        $("#removeKw").on("input", function () {
            chrome.runtime.sendMessage(
                { // message
                    action: "handle_removeKw_change",
                    enableIt: $(this)[0].checked,
                }
            )
            // console.log($(this)[0].checked);
            // handle_removeKw_change($(this)[0].checked);
        })
    });
});


