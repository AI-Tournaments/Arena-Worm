'use strict'
function a(){
	let data = ReplayHelper.getData();
	let playStarted = null;
	let slider = document.getElementById('slider');
	let sliderLayer = document.getElementById('slider-layer');
	let buttonBack = document.getElementById('step-back');
	let buttonNext = document.getElementById('step-next');
	let gameboard = document.getElementById('gamebord');
	let play = document.getElementById('play');
	play.addEventListener('click', playToggled);
	buttonBack.addEventListener('click', step);
	buttonNext.addEventListener('click', step);
	slider.max = data.log.length-1;
	slider.addEventListener('input', event=>{
		setTick(slider.valueAsNumber);
	});
	if(data.settings.arena.threeDimensions){
		sliderLayer.style.display = undefined;
	}
	window.onresize = ()=>{
		let allSquares = [...document.getElementsByClassName('square')];
		gameboard.style.zoom = 1;
		/*let maxWidth = allSquares[0].clientHeight;
		// Get max
		for(let square of allSquares){
			square.style.width = '';
			maxWidth = Math.max(maxWidth, square.clientWidth);
		}
		// Set max
		for(let square of allSquares){
			square.style.width = maxWidth + 'px';
		}*/
		let zoom = gameboard.parentElement.offsetWidth / gameboard.offsetWidth;
		gameboard.style.zoom = zoom;
	};
	setTick(0);
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
	function step(mouseEvent){
		slider.valueAsNumber += mouseEvent.target === buttonNext ? 1 : -1;
		setTick(slider.valueAsNumber);
	}
	function setTick(logIndex=-1){
		buttonBack.disabled = slider.valueAsNumber === 0;
		buttonNext.disabled = slider.valueAsNumber === data.log.length - 1;
		if(buttonNext.disabled && play.value !== '▶'){
			playToggled(undefined, true);
		}
		let tick = -1 < logIndex ? JSON.parse(JSON.stringify(data.log[logIndex])) : null;
		while(gameboard.firstChild){
			gameboard.removeChild(gameboard.lastChild);
		}
		let layerWrapper = document.createElement('div');
		layerWrapper.classList.add('layer');
		gameboard.appendChild(layerWrapper);
		let gridTemplateColumns = '';
		for(let y = data.settings.arena.size-1; 0 <= y; y--){
			gridTemplateColumns += 'auto ';
			for(let x = 0; x < data.settings.arena.size; x++){
				let space = document.createElement('div');
				space.classList.add('space');
				let spaceData = tick.value[x][y];
				if(spaceData.eatables.apple || 0 < spaceData.eatables.other){
					spaceData.eatables.other++;
					space.classList.add('eatable');
					if(spaceData.eatables.apple){
						space.innerHTML = '🍎';
					}
					if(false && 0 < spaceData.eatables.other){
						if(spaceData.eatables.apple){
							space.innerHTML += ', ';
						}
						space.innerHTML += spaceData.eatables.other;
					}
				}else if(spaceData.occupiedBy !== null){
					space.classList.add('type-'+spaceData.occupiedBy.type);
					if(spaceData.occupiedBy.type === 'Wall'){
						space.innerHTML = spaceData.occupiedBy.origin.team;
						space.classList.add('origin-type-'+spaceData.occupiedBy.origin.type);
					}else{
						space.innerHTML = spaceData.occupiedBy.team;
						space.classList.add('worm');
					}
				}
				layerWrapper.appendChild(space);
			}
		}
		layerWrapper.style.gridTemplateColumns = gridTemplateColumns.trim();
	}
}
