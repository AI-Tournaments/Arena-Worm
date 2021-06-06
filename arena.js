'use strict'
let _arena;
let _coordinate_end;
let _coordinate_middle;
let _participants;
let _settings;
let _shrinkOnTick;
let _tick = 0;
let _ticksSinceShrink = 0;
let _shrinks = 0;
let _worms = [];
let _worms_lastLength;
let _participantPromises;
class Direction{
	static #UP = new Direction();
	static #DOWN = new Direction();
	static #LEFT = new Direction();
	static #RIGHT = new Direction();
	static getUp = ()=>this.#UP;
	static getDown = ()=>this.#DOWN;
	static getLeft = ()=>this.#LEFT;
	static getRight = ()=>this.#RIGHT;
}
class Placeable{
	constructor(space=null){
		let currentSpace = space;
		this.getSpace = ()=>{
			return currentSpace;
		}
		this.setSpace = space=>{
			currentSpace = space;
		}
	}
}
class Wall extends Placeable{
	constructor(space=null, controllable=null){
		super(space);
		this.getOrigin = ()=>controllable;
		this.getTeam = ()=>null;
	}
}
class Controllable extends Placeable{
	constructor(body, space=null){
		const BODY = body;
		super(space);
		if(this.constructor.name === 'Controllable'){
			ArenaHelper.postAbort('', 'Controllable is not constructable.');
		}
		if(this.constructor.name === 'SolidWorm'){
			BODY.push(this);
		}
		this.getPlace = () => {
			return BODY.indexOf(this);
		}
		this.getLength = () => {
			return BODY.length;
		}
		this.getTeam = ()=>{
			return BODY[0].getTeamNumber();
		}
	}
}
class SolidWorm extends Controllable{
	constructor(team=null, direction=new Direction()){
		const BODY = new Array();
		super(BODY);
		this.direction = direction;
		this.getWormIndex = ()=>{
			let index = _worms.indexOf(this);
			if(index === -1){
				ArenaHelper.postAbort('', 'SolidWorm is dead.');
			}
			return index;
		}
		this.extendBody = ()=>{
			this.getWormIndex();
			BODY.push(new TrailingBody(BODY));
		}
		this.move = nextSpace=>{
			this.getWormIndex();
			let space;
			BODY.forEach(part=>{
				space = part.getSpace();
				if(nextSpace !== null){
					nextSpace.setOccupiedBy(part);
				}
				nextSpace = space;
			});
			if(space !== null){
				space.setOccupiedBy(null);
			}
		}
		this.getParticipant = ()=>{
			return _participants.get(team, 0);
		}
		this.getTeamNumber = ()=>team;
		this.kill = ()=>{
			_worms.splice(this.getWormIndex(), 1);
			BODY.forEach(part=>{
				let space = part.getSpace();
				let occupiedBy;
				switch(_settings.rules.defeatedWorms){
					case 'Solid':
						occupiedBy = new Wall(space, part);
						break;
					case 'Eatable':
						space.addEatable();
					case 'Disappears':
						occupiedBy = null;
						break;
				}
				space.setOccupiedBy(occupiedBy);
			});
		};
		this.isAlive = ()=>_worms.includes(this);
	}
}
class TrailingBody extends Controllable{
	constructor(body){
		super(body);
		this.getHead = ()=>body[0];
	}
}
class Space{
	static #placedApples = [];
	static getPlacedApples = ()=>Space.#placedApples.slice();
	constructor(){
		const CHALLENGERS = new Array()
		let occupiedBy = null;
		let eatables = 0;
		let apple = false;
		function willBeUnoccupied(){
			return occupiedBy === null ? true : !occupiedBy instanceof Wall && occupiedBy.getLength()-1 === occupiedBy.getPlace();
		}
		this.addEatable = ()=>{
			eatables++;
		}
		this.addChallenger = solidWorm=>{
			CHALLENGERS.push(solidWorm);
		}
		this.executeChallenge = ()=>{
			let unoccupied = willBeUnoccupied();
			CHALLENGERS.forEach(solidWorm => {
				if(unoccupied){
					if(apple){
						this.setApple(false);
						eatables++;
					}
					if(_settings.rules.winner === 'MostPoints'){
						_participants.addScore(solidWorm.getTeam(), eatables);
					}
					if(CHALLENGERS.length === 1){
						while(0 < eatables){
							eatables--;
							solidWorm.extendBody();
						}
					}
					solidWorm.move(this);
				}
				if(1 < CHALLENGERS.length || !unoccupied){
					solidWorm.kill();
				}
			});
			while(CHALLENGERS.length){
				CHALLENGERS.pop();
			}
		}
		this.getOccupiedBy = ()=>occupiedBy;
		this.setOccupiedBy = placeable=>{
			occupiedBy = placeable;
			if(placeable !== null){
				placeable.setSpace(this);
			}
		}
		this.setApple = ()=>{
			if(occupiedBy === null){
				apple = !Space.#placedApples.includes(this);
				if(apple){
					Space.#placedApples.push(this);
				}else{
					Space.#placedApples.splice(Space.#placedApples.indexOf(this), 1);
				}
			}
		}
		this.getEatables = ()=>{
			return {apple: apple, other: eatables};
		}
	}
}
function callback(response){
	response.participant.payload.response = response.data;
	updateDirection(response.participant);
	response.participant.payload.wormUpdated();
}
function getPos(solidWorm){
	for(let x = 0; x < _arena.length; x++){
		let array = _arena[x];
		for(let y = 0; y < array.length; y++){
			if(solidWorm === array[y].getOccupiedBy()){
				return [x, y];
			}
		}
	}
	ArenaHelper.postAbort('', 'Position not found.');
}
function getNextPos(pos, direction){
	switch(direction){
		case Direction.getUp():
			pos = [pos[0], pos[1]+1];
			break;
		case Direction.getDown():
			pos = [pos[0], pos[1]-1];
			break;
		case Direction.getLeft():
			pos = [pos[0]-1, pos[1]];
			break;
		case Direction.getRight():
			pos = [pos[0]+1, pos[1]];
			break;
	}
	let a = pos[0] < 0;
	let b = _settings.arena.size <= pos[0];
	let c = pos[1] < 0;
	let d = _settings.arena.size <= pos[1];
	if(a || b || c || d){
		if(_settings.arena.noBorder){
			if(a){
				pos[0] = _settings.arena.size-1;
			}else if(b){
				pos[0] = 0;
			}else if(c){
				pos[1] = _settings.arena.size-1;
			}else if(d){
				pos[1] = 0;
			}
		}else{
			return null;
		}
	}
	return pos;
}
function updateDirection(participant){
	let nextDirection = null;
	let solidWorm = participant.payload.worm;
	switch(participant.payload.response){
		case 0:
			nextDirection = solidWorm.direction; break;
		case -1:
			switch(solidWorm.direction){
				case Direction.getUp(): nextDirection = Direction.getLeft(); break;
				case Direction.getDown(): nextDirection = Direction.getRight(); break;
				case Direction.getLeft(): nextDirection = Direction.getDown(); break;
				case Direction.getRight(): nextDirection = Direction.getUp(); break;
			}
			break;
		case 1:
			switch(solidWorm.direction){
				case Direction.getUp(): nextDirection = Direction.getRight(); break;
				case Direction.getDown(): nextDirection = Direction.getLeft(); break;
				case Direction.getLeft(): nextDirection = Direction.getUp(); break;
				case Direction.getRight(): nextDirection = Direction.getDown(); break;
			}
			break;
	}
	if(nextDirection === null){
		ArenaHelper.log('error', solidWorm.getTeam() + ' Faulty direction, keep previous.');
	}else{
		solidWorm.direction = nextDirection;
	}
}
function parseArena(){
	let parsedArena = [];
	_arena.forEach(column => {
		let _column = [];
		parsedArena.push(_column);
		column.forEach(space => {
			let occupiedBy = space.getOccupiedBy();
			let _occupiedBy = null;
			if(occupiedBy !== null){
				_occupiedBy = {
					type: occupiedBy.constructor.name
				};
				if(occupiedBy instanceof Wall){
					let origin = occupiedBy.getOrigin();
					_occupiedBy.origin = origin === null ? null : {team: origin.getTeam(), type: origin.constructor.name};
				}else{
					_occupiedBy.team = occupiedBy.getTeam();
				}
			}
			_column.push({eatables: space.getEatables(), occupiedBy: _occupiedBy});
		});
	});
	return parsedArena;
}
function tick(){
	if(_shrinkOnTick !== null){
		_ticksSinceShrink++;
		if(_shrinkOnTick === _ticksSinceShrink){
			console.log('Shrink!');
			_ticksSinceShrink = 0;
			_arena.forEach((column, columnIndex) => {
				column.forEach((space, rowIndex) => {
					if(columnIndex === _shrinks || columnIndex === _arena.length-1-_shrinks || rowIndex === _shrinks || rowIndex === _arena.length-1-_shrinks){
						let occupiedBy = space.getOccupiedBy();
						if(occupiedBy !== null){
							switch(occupiedBy.constructor.name){
								case 'SolidWorm':
									occupiedBy.kill();
									break;
								case 'TrailingBody':
									occupiedBy.getHead().kill();
									break;
							}
							space.setOccupiedBy(new Wall(space, occupiedBy));
						}
					}
				});
			});
		}
		_shrinks++;
	}
	switch(_settings.rules.apples){
		case 'FourSymmetry': // When one is eaten, all get renewed.
			let retries = 100;
			while(0 < retries && Space.getPlacedApples().length < 4){
				retries--;
				Space.getPlacedApples().forEach(space => {
					space.setApple(false);
				});
				let short = Math.round(Math.random()*Math.floor(_settings.arena.size/2));
				let long = Math.round(Math.random()*Math.ceil(_settings.arena.size/2));
				_arena[short][long].setApple(true);
				_arena[_settings.arena.size-1-long][short].setApple(true);
				_arena[long][_settings.arena.size-1-short].setApple(true);
				_arena[_settings.arena.size-1-short][_settings.arena.size-1-long].setApple(true);
			}
			break;
		case 'FourRandom_asymmetric': // When one is eaten, all get renewed.
			Space.getPlacedApples().forEach(space => {
				space.setApple(false);
			});
			if(_arena.flat().filter(space=>space.getOccupiedBy()===null).length < 4){
				break;
			}
			while(Space.getPlacedApples().length < 4){
				let emptySpaces = _arena.flat().filter(space=>space.getOccupiedBy()===null);
				let randomSpace = Math.floor(Math.random()*emptySpaces.length);
				randomSpace.setApple(true);
			}
			break;
		case 'RandomOnePerWorm_asymmetric': // When one is eaten, only it get renewed.
			while(Space.getPlacedApples().length < _worms.length){
				let emptySpaces = _arena.flat().filter(space=>space.getOccupiedBy()===null);
				if(emptySpaces.length === 0){break;}
				let randomSpace = Math.floor(Math.random()*emptySpaces.length);
				randomSpace.setApple(true);
			}
			break;
	}
	let parsedArena = parseArena();
	ArenaHelper.log('tick', parsedArena);
	_participantPromises = [];
	_worms.forEach(solidWorm => {
		let arenaClone = JSON.parse(JSON.stringify(parsedArena));
		let rotate;
		switch(solidWorm.getTeam()){
			case 0: rotate = 0; break;
			case 1: rotate = 2; break;
			case 2: rotate = 1; break;
			case 3: rotate = 3; break;
		}
		for(let i = 0; i < rotate; i++){
			arenaClone = rotateArray(arenaClone);
		}
		let participant = solidWorm.getParticipant();
		participant.payload.response = null;
		participant.postMessage(arenaClone).then(callback);
		_participantPromises.push(new Promise(resolve => participant.payload.wormUpdated = resolve));
	});
	Promise.all(_participantPromises).then(()=>{
		let challengedSpaces = [];
		let borderCollisions = [];
		_worms.forEach(solidWorm => {
			let pos = getPos(solidWorm);
			let posNext = getNextPos(pos, solidWorm.direction);
			if(posNext === null){
				borderCollisions.push(solidWorm);
			}else{
				let space = _arena[posNext[0]][posNext[1]];
				space.addChallenger(solidWorm);
				if(!challengedSpaces.includes(space)){
					challengedSpaces.push(space);
				}
			}
		});
		borderCollisions.forEach(solidWorm => {
			solidWorm.kill();
		});
		challengedSpaces.forEach(space => {
			space.executeChallenge();
		});
		if(_settings.rules.winner === 'LastWormStanding' && _worms_lastLength !== _worms.length){
			_worms.forEach(solidWorm => {
				_participants.addScore(solidWorm.getTeam(), 1);
			});
		}
		_worms_lastLength = _worms.length;
		if(0 < _worms.length){
			tick();
		}else{
			ArenaHelper.log('tick', parseArena());
			ArenaHelper.postDone();
		}
	});
	_tick++;
}
function rotateArray(array){
	let result = [];
	for(let i = 0; i < array[0].length; i++){
		let row = array.map(e => e[i]).reverse();
		result.push(row);
	}
	return result;
}
ArenaHelper.init = (participants, settings) => {
	_participants = participants;
	_settings = settings;
	if(_participants.countTeams()%2 !== 0){
		ArenaHelper.postAbort('', 'Uneven amount of teams is not supported.');
	}else if(_settings.arena.size%2 !== 1){
		ArenaHelper.postAbort('', 'Arena size has to be uneven.');
	}else if(_settings.rules.winner === 'MostPoints' && _settings.rules.defeatedWorms !== 'Solid'){
		ArenaHelper.postAbort('', 'Incompatible rules: MostPoints can only be played with Solid.');
	}else if(!_settings.arena.threeDimensions && 4 < _participants.countTeams()){
		ArenaHelper.postAbort('', '`threeDimensions` is required for more than 4 participants.');
	}else if(_settings.arena.threeDimensions){
		ArenaHelper.postAbort('', '`threeDimensions` is currently not supported.');
	}else{
		let shrinkSetting = _settings.rules.noBorder ? -1 : _settings.rules.ticksPerBorderShrink;
		if(shrinkSetting < 0){
			_shrinkOnTick = null;
		}else if(shrinkSetting === 0){
			_shrinkOnTick = _settings.arena.size;
		}else{
			_shrinkOnTick = _settings.rules.ticksPerBorderShrink;
		}

		_arena = [];
		while(_arena.length < _settings.arena.size){
			let column = [];
			while(column.length < _settings.arena.size){
				column.push(new Space());
			}
			_arena.push(column);
		}

		_coordinate_end = _settings.arena.size-1;
		_coordinate_middle = Math.floor(_coordinate_end/2);

		let solidWorm = new SolidWorm(0, Direction.getUp());
		_arena[_coordinate_middle][0].setOccupiedBy(solidWorm);
		_worms.push(solidWorm);

		solidWorm = new SolidWorm(1, Direction.getDown());
		_arena[_coordinate_middle][_coordinate_end].setOccupiedBy(solidWorm);
		_worms.push(solidWorm);

		if(2 < _participants.countTeams()){
			solidWorm = new SolidWorm(2, Direction.getRight())
			_arena[0][_coordinate_middle].setOccupiedBy(solidWorm);
			_worms.push(solidWorm);

			solidWorm = new SolidWorm(3, Direction.getLeft())
			_arena[_coordinate_end][_coordinate_middle].setOccupiedBy(solidWorm);
			_worms.push(solidWorm);
		}
		_worms_lastLength = _worms.length;
		_worms.forEach(solidWorm => {
			solidWorm.getParticipant().payload.worm = solidWorm;
		});
		tick();
	}
};
