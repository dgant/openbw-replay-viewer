const fps = (1000 / 42);
let volumeSettings = JSON.parse(localStorage.volumeSettings || '{"level":0.5,"muted":false}');
let zoomLevel = parseInt(localStorage.zoomLevel || '0');
let viewerToggleSettings = JSON.parse(localStorage.viewerToggleSettings || '{"observerEnabled":true,"fowEnabled":true,"forceRedBlueEnabled":false}');
let exportState = null;
let scrubPreviewFrame = null;
let isDraggingVolumeSlider = false;

jQuery(document).ready( function($) {	
	
	var ctx = document.getElementById("infoChartCanvas");
	infoChart = new Chart(ctx, {
	    type: 'line',
	    animation: {duration: 0},
	    data: {
	        labels: [0],
	        datasets: [{
	            label: 'minerals 1',
	            data: [50],
	            pointRadius: 0,
	            lineTension: 0,
	            borderWidth: 1,
	            borderColor: '#54b9b1'
	        }, {
	            label: 'gas 1',
	            data: [0],
	            pointRadius: 0,
	            lineTension: 0,
	            borderWidth: 1,
	            borderColor: '#6ed279'
	        }, {
	            label: 'workers 1',
	            data: [0],
	            pointRadius: 0,
	            lineTension: 0,
	            borderWidth: 1,
	            borderColor: '#e6fb73',
	            hidden: true
	        }, {
	            label: 'army size 1',
	            data: [0],
	            pointRadius: 0,
	            lineTension: 0,
	            borderWidth: 1,
	            borderColor: '#b07042',
	            hidden: true
	        }, {
	            label: 'minerals 2',
	            data: [0],
	            pointRadius: 0,
	            lineTension: 0,
	            borderDash: [2, 2],
	            borderWidth: 1,
	            borderColor: '#54b9b1'
	        }, {
	            label: 'gas 2',
	            data: [0],
	            pointRadius: 0,
	            lineTension: 0,
	            borderDash: [2, 2],
	            borderWidth: 1,
	            borderColor: '#6ed279'
	        }, {
	            label: 'workers 2',
	            data: [0],
	            pointRadius: 0,
	            lineTension: 0,
	            borderDash: [2, 2],
	            borderWidth: 1,
	            borderColor: '#e6fb73',
	            hidden: true
	        }, {
	            label: 'army size 2',
	            data: [0],
	            pointRadius: 0,
	            lineTension: 0,
	            borderDash: [2, 2],
	            borderWidth: 1,
	            borderColor: '#b07042',
	            hidden: true
	        }
	        ]
	    },
	    options: {
	    	legend: {
	            display: true,
	            labels: {
	                fontColor: 'rgb(255, 255, 255)'
	            }
	        },
	        scales: {
	        	xAxes: [{
	                ticks: {
	                    display: false
	                }
	            }],
	            yAxes: [{
	                ticks: {
	                    fontColor: 'rgb(255, 255, 255)'
	                }
	            }]

	        }
	    }
	});

	// Ensure keyboard events on input elements are not swallowed by OpenBW
	$("input, textarea, select").on("keyup keydown keypress", function(e) {
		// Pressing enter should trigger submission if a submit button is attached
		if (e.type === 'keyup' && (e.keyCode || e.which) === 13) {
			let submitButtonId = $(e.target).data('submit-button');
			if (submitButtonId) {
				$('#' + submitButtonId).trigger('click');
			}
		}
		
		e.stopPropagation();
		return true;
	});
	
	$(document).keyup(function(e) {
		var code = e.keyCode || e.which;

		// Commands that work before and during a replay
		switch(code) {
			case 83:
				toggle_sound();
				return false;
			case 72: // h
				$('#quick_help').foundation($('#quick_help').is(':visible') ? 'close' : 'open');
				return false;
			case 78: // n
				$('.rv-rc-progress-bar>div').toggle();
				return false;
		}

		if (!main_has_been_called) return true;
			
		// Commands that only work during a replay
		switch(code) {
			case 32: // space
			case 80: // p
				toggle_pause();
				return false;
			case 65: // a
			case 85: // u
				play_faster();
				return false;
			case 90: // z
			case 68: // d
				play_slower();
				return false;
			case 81: // q
				ensure_paused();
				jump_frames(-10);
				return false;
			case 87: // w
				ensure_paused();
				jump_frames(-1);
				return false;
			case 69: // e
				ensure_paused();
				jump_frames(1);
				return false;
			case 82: // r
				ensure_paused();
				jump_frames(10);
				return false;
			case 88: // x
				jump_seconds(-30);
				return false;
			case 67: // c
				jump_seconds(-10);
				return false;
			case 86: // v
				jump_seconds(10);
				return false;
			case 66: // b
				jump_seconds(30);
				return false;
			case 71: // g
				toggle_graphs(1);
				return false;
			case 74: // j
				if ($('#goto').is(':visible')) {
					$('#goto').foundation('close');
				} else {
					open_goto_modal();
				}
				return false;
			case 173: // -
			case 189: // -
				zoomOut();
				return false;
			case 61: // =
			case 187: // =
				zoomIn();
				return false;
		}			
		return true;
	});
	
	$('#game-slider-handle').mousedown(function(){
	    isDown = true;
	});
	$('#game-slider').click(function(){
	    isClicked = true;
	});

	$(document).mouseup(function(){
	    if(isDown){
	        isDown = false;
	        scrubPreviewFrame = null;
	        update_timer(_replay_get_value(2));
	    }
		if (isDraggingVolumeSlider) {
			isDraggingVolumeSlider = false;
			if (!$('.volume:hover').length) {
				hide_volume_slider();
			}
		}
	}); 
	
	$(window).on('resize', function(){
		document.getElementById("canvas").innerWidth = window.innerWidth;
		document.getElementById("canvas").innerHeight = window.innerHeight - 147;
		apply_infobar_layout();
	});

	$('#zoom-in').on('click', function() {
		zoomIn();
	})
	
	$('#zoom-out').on('click', function() {
		zoomOut();
	})
	
	$('#game-slider').on('moved.zf.slider', function() {
		if (isDown || isClicked) {
			var new_val = document.getElementById("sliderOutput").value / 200;
			scrubPreviewFrame = Math.round(_replay_get_value(4) * new_val);
			update_timer(_replay_get_value(2));
			_replay_set_value(6, new_val);
			if (isClicked) {
				setTimeout(function() {
					scrubPreviewFrame = null;
					update_timer(_replay_get_value(2));
				}, 0);
			}
			isClicked = false;
		}
	});
	
	$('#rv-rc-play').on('click', function() {
		
		toggle_pause();
	});
	
	$('#rv-rc-sound').on('click', function() {
		
		toggle_sound();
	});

	$('#rv-rc-observer').on('click', function() {
		toggle_observer();
	});
	$('#rv-rc-force-colors').on('click', function() {
		toggle_force_red_blue_colors();
	});

	$('#rv-rc-fow').on('click', function() {
		toggle_fow();
	});
	$('[id^="vision"]').on('click', function() {
		var playerIndex = parseInt(this.id.replace('vision', ''), 10) - 1;
		toggle_player_vision(playerIndex);
	});
	
	$('#rv-rc-faster').on('click', function() {
		
		play_faster();
	});

	$('#rv-rc-export').on('click', function() {
		start_video_export();
	});
	$('#playlist-prev').on('click', function() {
		load_previous_replay();
	});
	$('#playlist-next').on('click', function() {
		load_next_replay();
	});
	
	$('#rv-rc-slower').on('click', function() {
		
		play_slower();
	});
	
	$('#rv-rc-sound').mouseenter(function() {
		show_volume_slider();
	});
	$('.volume').mouseleave(function() {
		if (!isDraggingVolumeSlider) {
	    	hide_volume_slider();
		}
	});
	$('#volume-slider, #volume-slider-handle').on('mousedown', function() {
		isDraggingVolumeSlider = true;
		show_volume_slider();
	});

	let volumeInitialized = false;
	$('#volume-slider').on('moved.zf.slider', function() {
		if (!volumeInitialized) return;

		volumeSettings.level = document.getElementById("volumeOutput").value / 100;
		volumeSettings.muted = (volumeSettings.level == 0);
		localStorage.volumeSettings = JSON.stringify(volumeSettings);

		if (volumeSettings.muted) {
			$('#rv-rc-sound').removeClass('rv-rc-sound');
			$('#rv-rc-sound').addClass('rv-rc-muted');
		} else {
			$('#rv-rc-sound').addClass('rv-rc-sound');
			$('#rv-rc-sound').removeClass('rv-rc-muted');
		}
		if (main_has_been_called) {
			Module.set_volume(volumeSettings.level);
		}
	});

	// Perform initial volume setup
	// We do this with a setTimeout because the Foundation slider seems to be borked - it doesn't correctly set the handle position and
	// resets it if we do this too early
	$('#volumeOutput').val(volumeSettings.level * 100).trigger('change');
	setTimeout(() => {
		$('#volume-slider-handle').css('top', '' + (88.8 * volumeSettings.level) + '%');
		if (volumeSettings.muted) {
			$('#rv-rc-sound').removeClass('rv-rc-sound');
			$('#rv-rc-sound').addClass('rv-rc-muted');
		} else {
			$('#rv-rc-sound').addClass('rv-rc-sound');
			$('#rv-rc-sound').removeClass('rv-rc-muted');
		}

		// Also pass to the BW engine if it's already been started (might happen when deep linking)
		if (main_has_been_called) {
			Module.set_volume(volumeSettings.muted ? 0 : volumeSettings.level);
		}
		volumeInitialized = true;
	}, 1000);
	
	function drag_start(event) {
	    var style = window.getComputedStyle(event.target, null);
	    event.dataTransfer.setData("text/plain", event.target.id + ',' +
	    (parseInt(style.getPropertyValue("left"),10) - event.clientX) + ',' + (parseInt(style.getPropertyValue("top"),10) - event.clientY));
	} 
	
	function drop(event) {
	    var parameters = event.dataTransfer.getData("text/plain").split(',');
	    var dm = document.getElementById(parameters[0]);
	    dm.style.left = (event.clientX + parseInt(parameters[1],10)) + 'px';
	    dm.style.top = (event.clientY + parseInt(parameters[2],10)) + 'px';
	    event.preventDefault();
	    return false;
	}
	
	document.getElementById('graphs_tab').addEventListener('dragstart',drag_start,false);
document.getElementById("canvas").addEventListener('drop', drop, false);
update_army_tab([]);
hide_volume_slider();
update_observer_button();
update_fow_button();
update_force_red_blue_button();
update_player_vision_buttons();
update_zoom_buttons();
apply_infobar_layout();
})	

function zoomOut() {
	if (zoomLevel <= -4) return;
	var nextZoomLevel = zoomLevel - 1;
	if (!can_zoom_to(nextZoomLevel)) return;
	zoomLevel = nextZoomLevel;
	localStorage.zoomLevel = '' + zoomLevel;
	resize_canvas(Module.canvas);
	update_zoom_buttons();
}

function zoomIn() {
	if (zoomLevel >= 4) return;
	zoomLevel++;
	localStorage.zoomLevel = '' + zoomLevel;
	resize_canvas(Module.canvas);
	update_zoom_buttons();
}

var infoChart;

function toggle_graphs(tab_nr) {
	
	 if ($('#graphs_tab').is(":visible")) {
		 
		 if ($('#graphs_tab_panel' + tab_nr).hasClass("is-active")) {
			 $('#graphs_tab').toggle();
		 } else {
			 $('#graphs_link' + tab_nr).click();
		 }
		 
	 } else {
		 $('#graphs_tab').toggle();
		 $('#graphs_link' + tab_nr).click();
	 }
}

function toggle_info_tab(tab_nr) {
	if (main_has_been_called) update_info_tab();
}

function apply_infobar_layout() {
	var container = document.querySelector('.infobar-container');
	var infobar = document.getElementById('infobar');
	var infoDock = document.getElementById('info-dock');
	var replayControl = document.querySelector('.replay-control');
	if (!container || !infobar) return;
	var hideOrder = ['hide-apm', 'hide-gas', 'hide-minerals', 'hide-army', 'hide-race', 'hide-workers', 'hide-supply'];
	var rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
	var widths = {
		vision: 2 * rootFontSize,
		race: 2.25 * rootFontSize,
		supply: 6.5 * rootFontSize,
		minerals: 4.75 * rootFontSize,
		gas: 3.75 * rootFontSize,
		workers: 4.25 * rootFontSize,
		army: 3.75 * rootFontSize,
		apm: 4.5 * rootFontSize
	};
	var preferredNameWidth = 224;
	var required_infobar_width = function() {
		var required = widths.vision + Math.min(preferredNameWidth, infobar.clientWidth || preferredNameWidth);
		if (!container.classList.contains('hide-race')) required += widths.race;
		if (!container.classList.contains('hide-supply')) required += widths.supply;
		if (!container.classList.contains('hide-minerals')) required += widths.minerals;
		if (!container.classList.contains('hide-gas')) required += widths.gas;
		if (!container.classList.contains('hide-workers')) required += widths.workers;
		if (!container.classList.contains('hide-army')) required += widths.army;
		if (!container.classList.contains('hide-apm')) required += widths.apm;
		return required;
	};
	var update_infobar_columns = function() {
		var columns = ['2rem'];
		if (!container.classList.contains('hide-race')) columns.push('2.25rem');
		columns.push((infobar.clientWidth || 0) >= preferredNameWidth ? 'minmax(224px, 1fr)' : 'minmax(0, 1fr)');
		if (!container.classList.contains('hide-supply')) columns.push('6.5rem');
		if (!container.classList.contains('hide-minerals')) columns.push('4.75rem');
		if (!container.classList.contains('hide-gas')) columns.push('3.75rem');
		if (!container.classList.contains('hide-workers')) columns.push('4.25rem');
		if (!container.classList.contains('hide-army')) columns.push('3.75rem');
		if (!container.classList.contains('hide-apm')) columns.push('4.5rem');
		infobar.style.setProperty('--infobar-columns', columns.join(' '));
	};

	var classes = ['hide-race', 'hide-apm', 'hide-army', 'hide-workers', 'hide-minerals', 'hide-gas', 'hide-supply', 'abbrev-names'];
	container.classList.remove('hide-info-dock');
	for (var i = 0; i < classes.length; ++i) {
		container.classList.remove(classes[i]);
	}

	var availableWidth = container.clientWidth;
	var minimumInfobarWidth = 520;
	var dockWidth = infoDock ? Math.ceil(infoDock.getBoundingClientRect().width || 760) : 760;
	var replayControlWidth = replayControl ? Math.ceil(replayControl.getBoundingClientRect().width || 224) : 224;
	if (availableWidth - dockWidth - replayControlWidth < minimumInfobarWidth) {
		container.classList.add('hide-info-dock');
	}

	if (window.innerWidth < 420) container.classList.add('abbrev-names');
	update_infobar_columns();

	for (var i = 0; i < hideOrder.length; ++i) {
		if (required_infobar_width() <= infobar.clientWidth && infobar.scrollWidth <= infobar.clientWidth) break;
		container.classList.add(hideOrder[i]);
		update_infobar_columns();
	}

	refresh_infobar_names();
	refresh_info_tab_scales();
}

function can_zoom_to(nextZoomLevel) {
	var canvasArea = document.getElementById('canvas-area');
	if (!canvasArea) return true;
	var unscaledSize = canvasArea.getBoundingClientRect();
	var zoomFactor = 1.0 * Math.pow(1.1, nextZoomLevel);
	var scaledWidth = Math.ceil(unscaledSize.width / zoomFactor);
	var scaledHeight = Math.ceil(unscaledSize.height / zoomFactor);
	if (scaledWidth > 4096 || scaledHeight > 4096) return false;
	return scaledWidth * scaledHeight <= 8000000;
}

function jump_seconds(seconds) {
	
	var frame = Math.max(0, _replay_get_value(2) + Math.round(fps * seconds));
	_replay_set_value(3, frame);
}

function apply_info_strip_scale(parent_element) {
	var element = parent_element && parent_element[0];
	if (!element) return;
	var visibleChildren = Array.prototype.filter.call(element.children, function(child) {
		return child.style.display !== 'none';
	});
	if (!visibleChildren.length) {
		element.setAttribute('data-scale', '1');
		return;
	}
	var availableWidth = element.clientWidth || 0;
	var scale = 4;
	var isArmyOrTech = /^(army|tech)_tab_content/.test(element.id);
	var tileWidths = isArmyOrTech ? { 1: 32, 2: 20, 3: 16, 4: 12 } : { 1: 36, 2: 18, 3: 12, 4: 9 };
	var tileGap = 1;
	if (availableWidth > 0) {
		[1, 2, 3, 4].some(function(candidate) {
			var rows = candidate === 1 ? 1 : candidate;
			var columns = Math.max(1, Math.floor((availableWidth + tileGap) / (tileWidths[candidate] + tileGap)));
			if (columns * rows >= visibleChildren.length) {
				scale = candidate;
				return true;
			}
			return false;
		});
	}
	element.setAttribute('data-scale', String(scale));
}

function refresh_info_tab_scales() {
	$('#info_tab .info_tab_content').each(function() {
		apply_info_strip_scale($(this));
	});
}

function jump_frames(frames) {
	
	var frame = Math.max(0, _replay_get_value(2) + frames);
	_replay_set_value(3, frame);
}

var gotoModalBindingsDone = false;
var pauseStateBeforeModal;
function open_goto_modal() {
	pauseStateBeforeModal = _replay_get_value(1);
	ensure_paused();
	if (!gotoModalBindingsDone) {
		$('#goto').on('closed.zf.reveal', function () {
			_replay_set_value(1, pauseStateBeforeModal);
		});
		$('#goto-frame-submit').on('click', function () {
			_replay_set_value(3, Math.max(0, $('#goto-frame-value').val()));
			$('#goto').foundation('close');
		});
		$('#goto-time-submit').on('click', function () {
			let timeStr = '' + $('#goto-time-value').val();
			let matches = [...timeStr.matchAll(/^(?:([0-9]+):)?([0-5]{0,1}[0-9]):([0-5][0-9])$/g)][0];
			if (!matches || matches.length != 4) {
				// Would be nice to show an error to the user here
				console.error("Error parsing time", timeStr, matches);
				return;
			}

			let seconds = parseInt(matches[3]) + 60*parseInt(matches[2]);
			if (matches[1]) seconds += 3600*parseInt(matches[1]);
			_replay_set_value(3, Math.round(seconds * fps));

			$('#goto').foundation('close');
		});

		gotoModalBindingsDone = true;
	}
	$('#goto').foundation('open');
}

function play_faster() {
	
	var current_speed = _replay_get_value(0);
	if (current_speed < 1024) {
		_replay_set_value(0, current_speed * 2);
		update_speed(current_speed * 2);
	}
}

function play_slower() {
	
	var current_speed = _replay_get_value(0);
	if (current_speed <= 1 / 128) return;
	_replay_set_value(0, current_speed / 2);
	update_speed(current_speed / 2);
}

function update_observer_button() {
	if (!main_has_been_called || typeof Module === "undefined" || typeof Module._observer_get_value !== "function") {
		$('#rv-rc-observer').toggleClass('is-enabled', true);
		return;
	}
	$('#rv-rc-observer').toggleClass('is-enabled', _observer_get_value() !== 0);
}

function persist_viewer_toggle_settings() {
	localStorage.viewerToggleSettings = JSON.stringify(viewerToggleSettings);
}

function apply_persisted_viewer_toggle_settings() {
	if (!main_has_been_called || typeof Module === "undefined") return;
	if (typeof Module._observer_set_value === "function") {
		_observer_set_value(viewerToggleSettings.observerEnabled ? 1 : 0);
	}
	if (typeof Module._fog_of_war_set_value === "function") {
		_fog_of_war_set_value(viewerToggleSettings.fowEnabled ? 1 : 0);
	}
	if (typeof Module._force_red_blue_colors_set_value === "function") {
		_force_red_blue_colors_set_value(viewerToggleSettings.forceRedBlueEnabled ? 1 : 0);
	}
	update_observer_button();
	update_fow_button();
	update_force_red_blue_button();
}

function show_volume_slider() {
	$('#volume-slider-wrapper').css("display", "block");
}

function hide_volume_slider() {
	$('#volume-slider-wrapper').css("display", "none");
}

function update_zoom_buttons() {
	$('#zoom-in').toggleClass('zoom-active', zoomLevel > 0);
	$('#zoom-out').toggleClass('zoom-active', zoomLevel < 0);
}

function update_fow_button() {
	if (!main_has_been_called || typeof Module === "undefined" || typeof Module._fog_of_war_get_value !== "function") {
		$('#rv-rc-fow').toggleClass('is-enabled', true);
		return;
	}
	$('#rv-rc-fow').toggleClass('is-enabled', _fog_of_war_get_value() !== 0);
}

function update_force_red_blue_button() {
	if (!main_has_been_called || typeof Module === "undefined" || typeof Module._force_red_blue_colors_get_value !== "function") {
		$('#rv-rc-force-colors').toggleClass('is-enabled', false);
		return;
	}
	$('#rv-rc-force-colors').toggleClass('is-enabled', _force_red_blue_colors_get_value() !== 0);
}

function toggle_observer() {
	if (!main_has_been_called || typeof Module === "undefined" || typeof Module._observer_get_value !== "function" || typeof Module._observer_set_value !== "function") return;
	_observer_set_value(_observer_get_value() === 0 ? 1 : 0);
	viewerToggleSettings.observerEnabled = _observer_get_value() !== 0;
	persist_viewer_toggle_settings();
	update_observer_button();
}

function toggle_fow() {
	if (!main_has_been_called || typeof Module === "undefined" || typeof Module._fog_of_war_get_value !== "function" || typeof Module._fog_of_war_set_value !== "function") return;
	_fog_of_war_set_value(_fog_of_war_get_value() === 0 ? 1 : 0);
	viewerToggleSettings.fowEnabled = _fog_of_war_get_value() !== 0;
	persist_viewer_toggle_settings();
	update_fow_button();
	update_player_vision_buttons();
}

function toggle_force_red_blue_colors() {
	if (!main_has_been_called || typeof Module === "undefined" || typeof Module._force_red_blue_colors_get_value !== "function" || typeof Module._force_red_blue_colors_set_value !== "function") return;
	_force_red_blue_colors_set_value(_force_red_blue_colors_get_value() === 0 ? 1 : 0);
	viewerToggleSettings.forceRedBlueEnabled = _force_red_blue_colors_get_value() !== 0;
	persist_viewer_toggle_settings();
	update_force_red_blue_button();
	if (typeof update_info_bar === "function") {
		first_frame_played = false;
		update_info_bar(_replay_get_value(2));
	}
}

function update_player_vision_buttons() {
	for (var i = 0; i < 12; ++i) {
		var button = $('#vision' + (i + 1));
		if (!button.length) continue;
		if (!main_has_been_called || typeof Module._fog_of_war_player_get_value !== "function" || i >= players.length) {
			button.hide();
			continue;
		}
		button.show();
		button.toggleClass('is-enabled', _fog_of_war_player_get_value(players[i]) !== 0);
	}
}

function toggle_player_vision(playerIndex) {
	if (!main_has_been_called || playerIndex < 0 || playerIndex >= players.length) return;
	if (typeof Module._fog_of_war_player_get_value !== "function" || typeof Module._fog_of_war_player_set_value !== "function") return;
	var player = players[playerIndex];
	var nextValue = _fog_of_war_player_get_value(player) === 0 ? 1 : 0;
	_fog_of_war_player_set_value(player, nextValue);
	update_player_vision_buttons();
}

function toggle_sound() {

	$('#rv-rc-sound').toggleClass('rv-rc-sound');
	$('#rv-rc-sound').toggleClass('rv-rc-muted');

	volumeSettings.muted = $('#rv-rc-sound').hasClass('rv-rc-muted');
	localStorage.volumeSettings = JSON.stringify(volumeSettings);
	
	if (main_has_been_called) {
		Module.set_volume(volumeSettings.muted ? 0 : volumeSettings.level);
	}
}

function best_export_mime_type() {
	var config = window.OPENBW_VIDEO_EXPORT_CONFIG || {};
	var mimeTypes = config.mimeTypes || ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
	for (var i = 0; i < mimeTypes.length; ++i) {
		if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mimeTypes[i])) {
			return mimeTypes[i];
		}
	}
	return '';
}

function set_export_button_state(isExporting) {
	$('#rv-rc-export').toggleClass('is-exporting', isExporting);
	$('#rv-rc-export').prop('disabled', isExporting);
}

function download_export_blob(blob) {
	var url = URL.createObjectURL(blob);
	var link = document.createElement('a');
	var mapName = document.getElementById('map1').dataset.fullName || 'openbw-replay';
	var safeMapName = mapName.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'openbw-replay';
	var config = window.OPENBW_VIDEO_EXPORT_CONFIG || {};
	var extension = config.extension || 'webm';
	link.href = url;
	link.download = safeMapName + '.' + extension;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	setTimeout(function() {
		URL.revokeObjectURL(url);
	}, 1000);
}

function restore_export_state(saved) {
	_replay_set_value(1, 1);
	_replay_set_value(3, saved.frame);
	_replay_set_value(0, saved.speed);
	if (typeof Module._observer_set_value === "function") {
		_observer_set_value(saved.observerEnabled ? 1 : 0);
		update_observer_button();
	}
	if (typeof Module._fog_of_war_set_value === "function") {
		_fog_of_war_set_value(saved.fowEnabled ? 1 : 0);
		update_fow_button();
	}
	_replay_set_value(1, saved.paused ? 1 : 0);
	update_speed(saved.speed);
	set_export_button_state(false);
	exportState = null;
}

function stop_video_export() {
	if (!exportState || !exportState.recorder) return;
	if (exportState.pollTimer) {
		clearInterval(exportState.pollTimer);
		exportState.pollTimer = null;
	}
	if (exportState.recorder.state !== 'inactive') {
		exportState.recorder.stop();
	}
}

function start_video_export() {
	if (exportState || !main_has_been_called) return;
	var config = window.OPENBW_VIDEO_EXPORT_CONFIG || {};
	var fps = config.fps || 24;
	var replaySpeed = config.replaySpeed || 1024;
	var pollIntervalMs = config.pollIntervalMs || 100;
	if (typeof MediaRecorder === "undefined" || !Module.canvas || typeof Module.canvas.captureStream !== "function") {
		print_to_modal("Video export unavailable", "This browser does not support canvas recording.");
		return;
	}

	var mimeType = best_export_mime_type();
	var stream = Module.canvas.captureStream(fps);
	var chunks = [];
	var saved = {
		frame: _replay_get_value(2),
		speed: _replay_get_value(0),
		paused: _replay_get_value(1) !== 0,
		observerEnabled: typeof Module._observer_get_value === "function" ? _observer_get_value() !== 0 : true,
		fowEnabled: typeof Module._fog_of_war_get_value === "function" ? _fog_of_war_get_value() !== 0 : true
	};

	set_export_button_state(true);
	print_to_modal(
		config.modalTitle || "Exporting video",
		config.modalMessage || "Recording replay to WebM from the opening frame at maximum replay speed.",
		false,
		{ bottomViewport: true }
	);

	var recorder;
	try {
		recorder = mimeType ? new MediaRecorder(stream, { mimeType: mimeType }) : new MediaRecorder(stream);
	} catch (error) {
		set_export_button_state(false);
		print_to_modal("Video export unavailable", "Failed to initialize the browser recorder.");
		return;
	}

	exportState = {
		recorder: recorder,
		stream: stream,
		chunks: chunks,
		saved: saved,
		targetEndFrame: window.__openbwTestExportFrameLimit ? Math.min(_replay_get_value(4), window.__openbwTestExportFrameLimit) : _replay_get_value(4),
		pollTimer: null
	};

	recorder.ondataavailable = function(event) {
		if (event.data && event.data.size) {
			chunks.push(event.data);
		}
	};
	recorder.onerror = function() {
		if (!exportState) return;
		restore_export_state(exportState.saved);
		print_to_modal("Video export failed", "The browser recorder reported an error.");
	};
	recorder.onstop = function() {
		if (!exportState) return;
		var stoppedState = exportState;
		if (stoppedState.stream) {
			stoppedState.stream.getTracks().forEach(function(track) {
				track.stop();
			});
		}
		close_modal();
		if (stoppedState.chunks.length) {
			download_export_blob(new Blob(stoppedState.chunks, { type: mimeType || 'video/webm' }));
		}
		restore_export_state(stoppedState.saved);
	};

	_replay_set_value(1, 1);
	_replay_set_value(3, 0);
	if (typeof Module._observer_set_value === "function") {
		_observer_set_value(1);
		update_observer_button();
	}

	var beginRecording = function() {
		if (_replay_get_value(2) > 0) {
			setTimeout(beginRecording, 50);
			return;
		}

		recorder.start();
		_replay_set_value(0, replaySpeed);
		update_speed(replaySpeed);
		_replay_set_value(1, 0);
		exportState.pollTimer = setInterval(function() {
			if (!exportState) return;
			if (_replay_get_value(2) >= exportState.targetEndFrame) {
				stop_video_export();
			}
		}, pollIntervalMs);
	};
	beginRecording();
}

function toggle_pause() {
	
	$('#rv-rc-play').toggleClass('rv-rc-play');
	$('#rv-rc-play').toggleClass('rv-rc-pause');
	
	update_info_tab();
	
	_replay_set_value(1, (_replay_get_value(1) + 1)%2);
}

function ensure_paused() {
	_replay_set_value(1, 1);
}

function update_speed(speed) {
	document.getElementById("rv-rc-speed").innerHTML = "speed: " + Number(speed).toFixed(2) + "x";
}

var IMG_URL1 = "images/production_icons/icon ";
var IMG_URL2 = ".bmp";
function set_icon(tab_nr, parent_element, child_nr, icon_id, percentage, info) {
	
	if (icon_id < 10) icon_id = "0" + icon_id;
	if (icon_id < 100) icon_id = "0" + icon_id;
	
	var img_src = IMG_URL1 + icon_id + IMG_URL2;
	while (parent_element.children("div").length <= child_nr) {
		parent_element.append('<div><img src="."><span></span><div class="prod_prog_bar"></div></div>');
	}
	var element = parent_element.children("div").eq(child_nr);
	var img_element = element.children("img");
	if (tab_nr === 2 && element.children("span").length === 0) {
		element.append('<span></span>');
	}
	
	if (img_element.attr("src").localeCompare(img_src) != 0) {
		img_element.attr("src", img_src);
	}
	if (tab_nr == 2) {
		element.children("span").html(info);
		element.children("div").first().html("");
	} else {
		element.children("div").css("width", Math.round(percentage * 36) + "px");
	}
	if (tab_nr == 3) {
		element.children("span").html(info);
	}
	element.css("display", "inline-block");
}

function clear_icon(parent_element, child_nr) {
	
	var element = parent_element.children("div").eq(child_nr);
	if (element.length) element.hide();
}

function update_army_tab(complete_units) {
	
	var unit_types = [[], [], [], [], [], [], [], [], [], [], [], []];
	for (var i = 0; i != complete_units.length; ++i) {
		
		var unit = complete_units[i];
		var type = unit.unit_type().id;
		if (type < 106 && type != 7 && type != 41 && type != 64) {
			
			// tank siege mode hack (assign id for tank tank mode)
			if (type == 30) {
				type = 5;
			}
			
			if (type in unit_types[unit.owner]) {
				unit_types[unit.owner][type] += 1;
			} else {
				unit_types[unit.owner][type] = 1;
			}
		}
	}
	
	var element;
    for (var i = 0; i < players.length; ++i) {
        
    	var type_count = 0;
    	element = $('#army_tab_content' + (i + 1));
    	for (type in unit_types[players[i]]) {
			
			var count = unit_types[players[i]][type];
			
			set_icon(2, element, type_count, type, 1, count);
			++type_count;
		}
		for (var j = type_count; j < 20; j++) {
    		clear_icon(element, j);
    	}
    	apply_info_strip_scale(element);
    }
}

var relevant_research = [0,1,2,3,5,7,8,9,10,11,13,15,16,17,19,20,21,22,24,25,27,30,31,32];
var unused_research = [4, 6, 12, 14, 18, 23, 26, 28, 29, 33, 34];

function update_research_tab(researches) {
	
	var element;
	for (var i = 0; i < researches.length; i++) {
		
		element = $('#research_tab_content' + (i+1));
		var upgrade_count = 1;
		var complete = researches[i][1];
		var index = 0;
		for (var j = 0; j < complete.length; j++) {
			
			if ($.inArray(complete[j].id, unused_research) == -1) {
				set_icon(4, element, index, complete[j].icon, 1, null);
				index++;
			}
		}
		
		var incomplete = researches[i][2];
		for (var j = 0; j < incomplete.length; j++) {
			
			var build_percentage = 1 - incomplete[j].remaining_time / incomplete[j].total_time;
			set_icon(4, element, j + index, incomplete[j].icon, build_percentage, null);
		}
		
		 //clear the unused spots
	    for (var j = incomplete.length + index; j < 20; ++j) {
	    	clear_icon(element, j);
	    }
	}
}

function update_tech_tab(upgrades, researches) {
	for (var i = 0; i < upgrades.length; i++) {
		var element = $('#upgrade_tab_content' + (i + 1));
		var slot = 0;
		var completeUpgrades = upgrades[i][1];
		for (var j = 0; j < completeUpgrades.length; j++) {
			set_icon(3, element, slot++, completeUpgrades[j].icon, 1, completeUpgrades[j].level);
		}

		var completeResearch = researches[i][1];
		for (var j = 0; j < completeResearch.length; j++) {
			if ($.inArray(completeResearch[j].id, unused_research) == -1) {
				set_icon(4, element, slot++, completeResearch[j].icon, 1, "");
			}
		}

		for (var j = slot; j < element.children("div").length; ++j) {
			clear_icon(element, j);
		}
		apply_info_strip_scale(element);
	}
}

function update_upgrades_tab(upgrades) {
	
	var element;
	for (var i = 0; i < upgrades.length; i++) {
		
		var upgrade_count = 1;
		var complete = upgrades[i][1];
		element = $('#upgrade_tab_content' + (i+1));
		
		for (var j = 0; j < complete.length; j++) {
			
			set_icon(3, element, j, complete[j].icon, 1, complete[j].level);
		}
		
		var incomplete = upgrades[i][2];
		for (var j = 0; j < incomplete.length; j++) {
			
			var build_percentage = 1 - incomplete[j].remaining_time / incomplete[j].total_time;
			set_icon(3, element, j + complete.length, incomplete[j].icon, build_percentage, incomplete[j].level);
		}
		
		 //clear the unused spots
	    for (var j = complete.length + incomplete.length; j < 20; ++j) {
	    	clear_icon(element, j);
	    }
	}
}

var productionUnit_compare = function (unit1, unit2) {
	
	var build_time1 = unit1.build_type() ? unit1.build_type().build_time : unit1.unit_type().build_time;
	var build_time2 = unit2.build_type() ? unit2.build_type().build_time : unit2.unit_type().build_time;
	
	return (build_time2 - unit2.remaining_build_time)  - (build_time1 - unit1.remaining_build_time);
}

function update_production_tab(incomplete_units, upgrades, researches) {
	
	incomplete_units.sort(productionUnit_compare);
	
	var unit_names = [[], [], [], [], [], [], [], [], [], [], [], []];
	
	for (var i = 0; i != incomplete_units.length; ++i) {
		var u = incomplete_units[i];
		var t;
		var build_time;
		if (u.build_type()) {
			t = u.build_type().id;
			build_time = u.build_type().build_time;
			
		} else {
			t = u.unit_type().id;
			build_time = u.unit_type().build_time;
		}
		
		var build_percentage = 1 - u.remaining_build_time / build_time;
		
		unit_names[u.owner].push([t, build_percentage]);
	}

	if (upgrades) {
		for (var i = 0; i < upgrades.length; ++i) {
			var incompleteUpgrades = upgrades[i][2];
			for (var j = 0; j < incompleteUpgrades.length; ++j) {
				var upgradeProgress = 1 - incompleteUpgrades[j].remaining_time / incompleteUpgrades[j].total_time;
				unit_names[upgrades[i][0]].push([incompleteUpgrades[j].icon, upgradeProgress]);
			}
		}
	}

	if (researches) {
		for (var i = 0; i < researches.length; ++i) {
			var incompleteResearch = researches[i][2];
			for (var j = 0; j < incompleteResearch.length; ++j) {
				if ($.inArray(incompleteResearch[j].id, unused_research) == -1) {
					var researchProgress = 1 - incompleteResearch[j].remaining_time / incompleteResearch[j].total_time;
					unit_names[researches[i][0]].push([incompleteResearch[j].icon, researchProgress]);
				}
			}
		}
	}
	
	var element;
    for (var i = 0; i < players.length; ++i) {
        
    	element = $('#production_tab_content' + (i + 1));
    	
    	//fill the spots with all units in production for current player
	    for (var j = 0; j != unit_names[players[i]].length; ++j) {
	    	
	    	set_icon(1, element, j, unit_names[players[i]][j][0], unit_names[players[i]][j][1], null);
	    }
	    
	    //clear the unused spots
	    for (var j = unit_names[players[i]].length; j < 100; ++j) {
	    	clear_icon(element, j);
	    }
	    apply_info_strip_scale(element);
    }
}

function update_timer(frame) {
	var displayFrame = scrubPreviewFrame !== null ? scrubPreviewFrame : frame;
	var sec_num = displayFrame  * 42 / 1000;
	var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = Math.floor(sec_num - (hours * 3600) - (minutes * 60));

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    
    var time = minutes+':'+seconds;
    if (hours > 0) {
    	time = hours + ':' + time;
    }
	var timerElement = document.getElementById("rv-rc-timer");
	timerElement.innerHTML = "time: " + time;
	timerElement.classList.toggle("scrub-preview", scrubPreviewFrame !== null);
	
	$("#goto-frame-value").val(displayFrame);
	$("#goto-time-value").val(time);
}

var isDown = false;
var isClicked = false;

function update_handle_position(value) {
	
	if (!isDown && !isClicked) {
		document.getElementById("sliderOutput").value = value;
		$('#sliderOutput').trigger("change");
	}
}

function set_map_name(name) {
	document.getElementById("map1").dataset.fullName = name;
	document.getElementById("map2").dataset.fullName = name;
	document.getElementById("map1").innerHTML = name;
	document.getElementById("map2").innerHTML = name;
}

function set_color(player, color) {
		
	var rgb_color;
	switch(color) {
	case 0:
		rgb_color = "rgba(244, 4, 4, 1)";
		break;
	case 1:
		rgb_color = "rgba(12, 72, 204, 1)";
		break;
	case 2:
		rgb_color = "rgba(44, 180, 148, 1)";
		break;
	case 3:
		rgb_color = "rgba(136, 64, 156, 1)";
		break;
	case 4:
		rgb_color = "rgba(248, 140, 20, 1)";
		break;
	case 5:
		rgb_color = "rgba(112, 48, 20, 1)";
		break;
	case 6:
		rgb_color = "rgba(204, 224, 208, 1)";
		break;
	case 7:
		rgb_color = "rgba(252, 252, 56, 1)";
		break;
	case 8:
		rgb_color = "rgba(8, 128, 8, 1)";
		break;
	case 9:
		rgb_color = "rgba(252, 252, 124, 1)";
		break;
	case 10:
		rgb_color = "rgba(236, 196, 176, 1)";
		break;
	case 11:
		rgb_color = "rgba(64, 104, 212, 1)";
		break;
	}
	var forcedRedBlue = main_has_been_called && typeof Module._force_red_blue_colors_get_value === "function" && _force_red_blue_colors_get_value() !== 0 && players.length === 2;
	if (forcedRedBlue) {
		if (player === 1) rgb_color = "rgba(244, 4, 4, 1)";
		else if (player === 2) rgb_color = "rgba(12, 72, 204, 1)";
	}
	// infoChart.data.datasets[(player-1) * 4].borderColor = rgb_color;
	// infoChart.data.datasets[(player-1) * 4 + 1].borderColor = rgb_color;
	// infoChart.data.datasets[(player-1) * 4 + 1].backgroundColor = rgb_color.replace(/[\d\.]+\)$/g, '0.1)');
	// infoChart.data.datasets[(player-1) * 4 + 2].borderColor = rgb_color;
	// infoChart.data.datasets[(player-1) * 4 + 3].borderColor = rgb_color;
	
	$('.player_color' + player).css('border-color', rgb_color);
}

function set_nick(player, nick) {
	var element = document.getElementById("nick" + player);
	element.dataset.fullName = nick;
	element.innerHTML = nick;
	refresh_infobar_names();
}

function abbreviate_name(name) {
	if (!name) return "";
	if (name.length <= 8) return name;
	return name.slice(0, 7) + ".";
}

function refresh_infobar_names() {
	var container = document.querySelector('.infobar-container');
	if (!container) return;
	var abbreviate = container.classList.contains('abbrev-names');
	for (var i = 1; i <= 8; ++i) {
		var nickElement = document.getElementById("nick" + i);
		if (nickElement && nickElement.dataset.fullName) {
			nickElement.innerHTML = abbreviate ? abbreviate_name(nickElement.dataset.fullName) : nickElement.dataset.fullName;
		}
	}
	var map1 = document.getElementById("map1");
	var map2 = document.getElementById("map2");
	if (map1 && map1.dataset.fullName) map1.innerHTML = abbreviate ? abbreviate_name(map1.dataset.fullName) : map1.dataset.fullName;
	if (map2 && map2.dataset.fullName) map2.innerHTML = abbreviate ? abbreviate_name(map2.dataset.fullName) : map2.dataset.fullName;
}

function set_supply(player, supply) {
	document.getElementById("supply" + player).innerHTML = supply;
}

function set_minerals(player, minerals) {
	document.getElementById("minerals" + player).innerHTML = minerals;
}

function set_gas(player, gas) {
	document.getElementById("gas" + player).innerHTML = gas;
}

function set_workers(player, workers) {
	document.getElementById("workers" + player).innerHTML = workers;
}

function set_army(player, army) {
	document.getElementById("army" + player).innerHTML = army;
}

var player_race_cache  = [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1];
function set_race(player, race) {
	
	if (player_race_cache[player] != race) {
		
		player_race_cache[player] = race;
		var race_name;
		if (race == 0) {
			race_name = "zerg";
		} else if (race == 1) {
			race_name = "terran";
		} else if (race == 2) {
			race_name = "protoss";
		}
		console.log("setting race emblem for player " + player);
		$('#race' + player).css("background-image", "url('images/race_emblems/" + race_name + ".png')");
	}
}

function set_apm(player, apm) {
	document.getElementById("apm" + player).innerHTML = apm;
}
