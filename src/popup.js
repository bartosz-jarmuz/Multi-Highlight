// ************************************************************************
// Multi Highlight popup js
// ************************************************************************
// debugger;
defaultSettings = {
	delim: ",",
	isAlwaysSearch: false,
	isOn: true,
	isCasesensitive: true,
	isInstant: true,
	isNewlineNewColor: false,
	isSaveKws: false,
	isWholeWord: false,
	latest_keywords: [],
	popup_height: 100,
	popup_width: 400
};

document.addEventListener('DOMContentLoaded', function () {
	chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
		var currTab = tabs[0];
		if (currTab) { // Sanity check
			var tabkey = get_tabkey(currTab.id);
			chrome.storage.local.get(['settings', tabkey], function (result) {
				// init general settings
				var settings = Object.assign(defaultSettings, result.settings);
				var tabinfo = result[tabkey];
				// reconstruct highlightWords values
				// flag = {}
				// flag.is_change = settings.isSaveKws && tabinfo.isNewPage;
				// kws = flag.is_change ? settings.latest_keywords : tabinfo.keywords;
				kws = tabinfo.keywords;

				highlightWords.value = keywordsToStr(kws, settings)
				// if(settings.isNewlineNewColor){
				// 	// highlightWords.value = kws.map(line=>line.join(settings.delim)).join("\n");
				// 	// add newline character to where the kwGrp changes, otherwise, add delimeter
				// 	var res = "";
				// 	for(var i = 0, len = kws.length - 1; i < len; ++ i){
				// 		res += kws[i].kwStr + ((kws[i].kwGrp != kws[i+1].kwGrp) ? "\n": settings.delim);
				// 	}
				// 	// and the last one
				// 	kws.length && (res += kws[kws.length-1].kwStr);
				// 	console.log(res);
				// 	highlightWords.value = res;
				// }else{
				// 	highlightWords.value = kws.map(kw=>kw.kwStr).join(settings.delim);
				// 	// append deliminator if there are words
				// 	highlightWords.value += highlightWords.value ? settings.delim : "";
				// }

				// tabinfo.isNewPage = false;
				chrome.storage.local.set({[tabkey]: tabinfo, "settings": settings}, function () {
					handle_highlightWords_change(tabkey, {fromBackground: true});
				});

				// init popup interface
				container.style.width = settings.popup_width + "px";
				highlightWords.style.minHeight = settings.popup_height + "px";
				// init popup values
				delimiter.value         = settings.delim;
				instant.checked         = settings.isInstant;
				toggleMHL.checked       = settings.isOn;
				alwaysSearch.checked    = settings.isAlwaysSearch;
				newlineNewColor.checked = settings.isNewlineNewColor;
				casesensitive.checked   = settings.isCasesensitive;
				wholeWord.checked       = settings.isWholeWord;
				saveWords.checked       = settings.isSaveKws;
				// build interactable keywords list
				build_keywords_list(kws);
				// register listener
				$("#highlightWords").on("input", function () {
					handle_highlightWords_change(tabkey, {fromBackground: true});
				})
				$("#kw-list").on("click", function (event) {
					handle_keyword_removal(event, tabkey, {fromBackground: true});
				})
				$("#toggleMHL,#casesensitive, #wholeWord, #delimiter, #instant,"
					+ " #saveWords,#alwaysSearch,#newlineNewColor").on("input", function(event) {
					handle_option_change(tabkey, event);
				});
				$('#forceRefresh').on("click", function(){
					handle_highlightWords_change(tabkey, {refresh: true, fromBackground: true});
				})
				$("#options_icon").click(function(){
					chrome.runtime.openOptionsPage();
				})
			});
		}
	});
	check_keywords_existence();
});



function build_keywords_list(inputKws){
	var html = inputKws.map(kw=>`<span class="keywords">${kw.kwStr}</span>`).join("");
	$('#kw-list>.keywords').remove();
	$(html).appendTo($('#kw-list'));
	check_keywords_existence();
}

function check_keywords_existence(){
	chrome.tabs.executeScript(null, {
		file: "getPagesSource.js"
	}, function() {
		// If you try and inject into an extensions page or the webstore/NTP you'll get an error
		if (chrome.runtime.lastError) {
			console.error( 'There was an error injecting script : \n' + chrome.runtime.lastError.message);
		}
	});
}

chrome.runtime.onMessage.addListener(function(request, sender) {
	if (request.action == "getVisibleText") {
		visibleText = request.source;
		chrome.storage.local.get(['settings'], function (result) {
			var settings = result.settings;
			document.querySelectorAll('#kw-list>.keywords').forEach(elem=>{
				var pattern = settings.isWholeWord
					? '\\b(' + elem.innerText + ')\\b'
					: '(' + elem.innerText + ')';
				visibleText.match(new RegExp(pattern, settings.isCasesensitive ? '': 'i'))
					?  elem.classList.remove("notAvailable")
					: elem.classList.add("notAvailable");
			});
		});
	}
});


function handle_keyword_removal(event, tabkey, option={}){
	console.log(event);
	if(event.ctrlKey && event.target.matches('.keywords')){ // bugfix: don't remove the container
		chrome.storage.local.get(['settings'], function (result) {
			var settings = result.settings;
			event.target.remove();
			highlightWords.value = [...document.querySelectorAll('#kw-list>.keywords')].map(elem=>elem.innerText).join(settings.delim);
			handle_highlightWords_change(tabkey, option); // update highlights
		});
	}
}

// ****** Multi Highlight functions
// option.refresh -- when true, rehighlight webpage content
// option.useSavedKws -- when true, use saved kws instead of highlightWords.value as inputStr
// option.fromBackground -- if you run this function from popup or background, remember to set it to true. Otherwise, we expect the call is from content script
function handle_highlightWords_change(tabkey, option={}, callback=null) {
    chrome.storage.local.get(['settings', tabkey], function (result) {
        var settings = result.settings;
        var tabinfo = result[tabkey];
		var tabId = get_tabId(tabkey);

		if(!settings.isOn){
			// hl_clearall(settings, tabinfo);
			chrome.tabs.sendMessage(tabId, {
				action: "hl_clearall",
			})
			return;
		}

		if (!option.useSavedKws){
			inputStr = highlightWords.value;
		} else {
			inputStr = keywordsToStr(tabinfo.keywords, settings)
		}

        // (instant search mode) or (last char of input is delimiter)
        if (settings.isInstant || inputStr.slice(-1) == settings.delim) {
			console.log(inputStr)
			inputKws = keywordsFromStr(inputStr, settings);
			savedKws = tabinfo.keywords;
			// console.log(`inputKws: ${inputKws.length}: `);
			// console.log(inputKws);
			// differ it
			addedKws = KeywordsMinus(inputKws, savedKws);
			removedKws = KeywordsMinus(savedKws, inputKws);
			// console.log(addedKws);
			// console.log(removedKws);

			if(option.refresh){
				chrome.tabs.sendMessage(tabId, {
					action: "hl_refresh",
					inputKws: [...inputKws], // make a copy to avoid affection from sorting the _hl_search
				})
			}else{
				chrome.tabs.sendMessage(tabId, {
					action: "_hl_clear",
					removedKws: removedKws,
				}, function(response){
					// settings.isNewlineNewColor || (tabinfo.style_nbr -= removedKws.length); // !! always keep this after _hl_clear function !!
					chrome.tabs.sendMessage(tabId, {
						action: "_hl_search",
						addedKws: addedKws,
					});
				});
			}
          
            tabinfo.keywords = inputKws;
			if (option.fromBackground){
				build_keywords_list(inputKws);
			}
            settings.latest_keywords = inputKws;
            chrome.storage.local.set({[tabkey]: tabinfo, "settings": settings});
        } else if (!inputStr) { // (empty string)
            chrome.tabs.sendMessage(tabId, {
				action: "hl_clearall",
			})
            tabinfo.keywords = [];
            settings.latest_keywords = "";
            chrome.storage.local.set({[tabkey]: tabinfo, "settings": settings});
        }

		callback && callback();
    });
}


function handle_option_change(tabkey, event) { // tabkey of popup window
	chrome.storage.local.get(['settings'], function (result) {
		var settings = result.settings;

		var forceRefresh = (settings.isWholeWord != wholeWord.checked)
			|| (settings.isCasesensitive != casesensitive.checked)
			|| (settings.isNewlineNewColor != newlineNewColor.checked)
			|| event.currentTarget === toggleMHL;
		// update settings
		settings.isOn              = toggleMHL.checked;
		settings.delim             = delimiter.value;
		settings.isInstant         = instant.checked;
		settings.isAlwaysSearch    = alwaysSearch.checked;
		settings.isNewlineNewColor = newlineNewColor.checked;
		settings.isCasesensitive   = casesensitive.checked;
		settings.isWholeWord       = wholeWord.checked;
		settings.isSaveKws         = saveWords.checked;

        if (settings.isSaveKws){
            $('#alwaysSearch').removeAttr('disabled'); // enable input
        }else{
            $('#alwaysSearch').prop("checked", false); // uncheck alwaysSearch
            settings.isAlwaysSearch = false; // set alwaysSearch to false
            $('#alwaysSearch').attr('disabled', true); // disable alwaysSearch checkbox
        }

		chrome.storage.local.set({'settings': settings}, function () {
			if (tabkey) {
				handle_highlightWords_change(tabkey, {refresh: forceRefresh, fromBackground: true});
			}
		});
	});
}