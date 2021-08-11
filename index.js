'use strict'
function a(){
	ReplayHelper.init(arenaResult=>{
		let playStarted = null;
		let controller = document.getElementById('controller');
		let slider = document.getElementById('slider');
		let sliderLayer = document.getElementById('slider-layer');
		let buttonBack = document.getElementById('step-back');
		let buttonNext = document.getElementById('step-next');
		let gameboard = document.getElementById('gameboard');
		let scoreBoard = document.getElementById('score-board');
		let selectMatches = document.getElementById('matches');
		let play = document.getElementById('play');
		let _currentMatchIndex;
		window.onresize = ()=>{
			gameboard.style.zoom = 1;
			let bodyMargin = parseFloat(window.getComputedStyle(document.body, null).getPropertyValue('margin-top'))+parseFloat(window.getComputedStyle(document.body, null).getPropertyValue('margin-bottom'));
			let wrapperHeight = window.innerHeight - parseFloat(window.getComputedStyle(controller, null).getPropertyValue('height')) - bodyMargin;
			let wrapperSize = gameboard.parentElement.offsetWidth < wrapperHeight ? gameboard.parentElement.offsetWidth : wrapperHeight;
			let zoom = wrapperSize / gameboard.offsetWidth;
			gameboard.style.zoom = zoom;
		};
		selectMatches.onchange = ()=>{
			let index = parseInt(selectMatches.selectedOptions[0].dataset.index);
			_currentMatchIndex = index;
			let matchLog = arenaResult.matchLogs[_currentMatchIndex];
			slider.max = matchLog.log.length-1;
			slider.addEventListener('input', event=>{
				setTick(slider.valueAsNumber);
			});
			if(arenaResult.settings.arena.threeDimensions){
				sliderLayer.style.display = undefined;
			}
			setTick(0);
			playToggled(undefined, true);
			function playFrame(){
				if(play.value !== '▶'){
					if(250 < Date.now()-playStarted){
						step({target: buttonNext});
						playStarted = Date.now();
					}
				}
				window.requestAnimationFrame(playFrame);
			}
			playFrame();
			let scoreBoardString = '';
			let matchLogErrors = arenaResult.matchLogs.filter(l => l.error);
			if(matchLogErrors.length){
				scoreBoardString = '<b style="color: red">Aborted</b><br>';
				matchLogErrors.forEach(matchLogError => scoreBoardString += '<div style="color: white">Match '+(arenaResult.matchLogs.findIndex(l => l===matchLogError)+1)+': '+(matchLogError.participantName?matchLogError.participantName+': ':'')+matchLogError.error+'</div>');
			}
			if(arenaResult.result.partialResult){
				scoreBoardString += '<div style="text-align: center; font-style: italic;">Partial result</div>';
			}
			scoreBoardString += '<table><tr><th>Team</th><th>Participant</th>';
			let dataRows = [];
			arenaResult.matchLogs.forEach((matchLog, index) => {
				if(matchLog.scores){
					scoreBoardString += '<th>Match '+(index+1)+'</th>';
					matchLog.scores.forEach(score => {
						if(!dataRows[score.team]){
							dataRows[score.team] = '<tr style="color:'+arenaResult.teams[score.team].color.RGB+';"><td>'+score.team+'</td><td>'+score.members[0].name+'</td>';
						}
						dataRows[score.team] += '<td>'+score.score+'</td>';
					});
				}
			});
			arenaResult.result.team.forEach((r,i) => {
				dataRows[i] += '<td>'+r.total.score+'</td><td>'+r.average.score+'</td></tr>';
			});
			scoreBoardString += '<th>Total</th><th>Average</th></tr>'+dataRows.join('')+'</table>';
			scoreBoard.innerHTML = scoreBoardString;
		}
		function playToggled(mouseEvent, stop=false){
			if(stop || play.value !== '▶'){
				play.value = '▶';
				playStarted == null;
			}else{
				if(buttonNext.disabled){
					slider.valueAsNumber = -1;
				}
				play.value = '❚❚';
				playStarted = Date.now();
			}
			window.onresize();
		}
		function setTick(logIndex=-1){
			let matchLog = arenaResult.matchLogs[_currentMatchIndex];
			let isFinished = slider.valueAsNumber === matchLog.log.length - 1 || matchLog.log.length === 0;
			buttonBack.disabled = slider.valueAsNumber === 0;
			buttonNext.disabled = isFinished;
			scoreBoard.style.display = isFinished ? '' : 'none';
			if(isFinished && play.value !== '▶'){
				playToggled(undefined, true);
			}
			let tick = logIndex < matchLog.log.length ? JSON.parse(JSON.stringify(matchLog.log[logIndex])) : null;
			while(gameboard.firstChild){
				gameboard.removeChild(gameboard.lastChild);
			}
			if(tick){
				let layerWrapper = document.createElement('div');
				layerWrapper.classList.add('layer');
				gameboard.appendChild(layerWrapper);
				let gridTemplateColumns = '';
				for(let y = arenaResult.settings.arena.size-1; 0 <= y; y--){
					gridTemplateColumns += 'auto ';
					for(let x = 0; x < arenaResult.settings.arena.size; x++){
						let space = document.createElement('div');
						space.classList.add('space');
						let spaceData = tick.value[x][y];
						if(spaceData.eatables.apple || 0 < spaceData.eatables.other){
							space.classList.add('eatable');
							if(spaceData.eatables.apple){
								space.innerHTML = '🍎';
							}else if(0 < spaceData.eatables.other){
								space.innerHTML = spaceData.eatables.other;
								space.style.fontStyle = 'italic';
							}
						}
						if(spaceData.occupiedBy !== null){
							space.classList.add('type-'+spaceData.occupiedBy.type);
							if(spaceData.occupiedBy.type === 'Wall'){
								spaceData.grave.forEach(part => {
									let span = document.createElement('span');
									span.innerHTML = part.team;
									span.classList.add('type-'+part.type);
									span.style.color = arenaResult.teams[part.team].color.RGB;
									space.appendChild(span);
								});
							}else{
								let span = document.createElement('span');
								span.innerHTML = spaceData.occupiedBy.team;
								span.classList.add('worm');
								span.style.color = arenaResult.teams[spaceData.occupiedBy.team].color.RGB;
								space.appendChild(span);
							}
						}
						layerWrapper.appendChild(space);
					}
				}
				layerWrapper.style.gridTemplateColumns = gridTemplateColumns.trim();
			}
		}
		function step(mouseEvent){
			slider.valueAsNumber += mouseEvent.target === buttonNext ? 1 : -1;
			setTick(slider.valueAsNumber);
		}
		play.addEventListener('click', playToggled);
		buttonBack.addEventListener('click', step);
		buttonNext.addEventListener('click', step);
		arenaResult.matchLogs.forEach((matchLog, index) => {
			let option = document.createElement('option');
			selectMatches.appendChild(option);
			option.innerHTML = 'Match '+(index+1);
			option.dataset.index = index;
			if(index === 0){
				selectMatches.onchange();
			}
			if(arenaResult.matchLogs.length === 1){
				selectMatches.style.disabled = 'none';
			}
		});
	});
}
