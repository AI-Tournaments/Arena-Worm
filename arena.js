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
	constructor(name){
		Object.defineProperty(this, 'name', {
			value: name,
			writable: false,
			enumerable: true,
			configurable: true
		});
		this.toString = ()=>name;
	}
}
const Directions = {'FORWARD': new Direction('Forward'), 'BACKWARD': new Direction('Backward'), 'LEFT': new Direction('Left'), 'RIGHT': new Direction('Right'), 'UP': new Direction('Up'), 'DOWN': new Direction('Down')}
Object.freeze(Directions);
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
	constructor(space=null){
		super(space);
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
	constructor(team=null, direction=new Direction(), startSize=1){
		const BODY = new Array();
		super(BODY);
		this.direction = direction;
		this.getWormIndex = ()=>{
			let index = _worms.indexOf(this);
			if(index === -1){
				ArenaHelper.postAbort('', 'SolidWorm not in list.');
			}
			return index;
		}
		this.extendBody = ()=>{
			BODY.push(new TrailingBody(BODY));
		}
		this.move = nextSpace=>{
			let firstSpace = nextSpace;
			if(_settings.rules.apples === 'AppleLess'){
				this.extendBody();
			}
			let lastSpace;
			BODY.forEach(part=>{
				lastSpace = part.getSpace();
				if(nextSpace !== null){
					nextSpace.setOccupiedBy(part);
				}
				nextSpace = lastSpace;
			});
			if(lastSpace && firstSpace !== lastSpace && BODY.includes(lastSpace.getOccupiedBy())){
				lastSpace.setOccupiedBy(null);
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
				space.addToGrave(part);
				if(space !== null){
					let occupiedBy;
					switch(_settings.rules.defeatedWorms){
						case 'Solid':
							occupiedBy = new Wall(space);
							break;
						case 'Eatable':
							space.addEatable();
							if(part.constructor.name === 'SolidWorm'){
								BODY.filter(b => b.getSpace() === null).forEach(space.addEatable);
							}
						case 'Disappears':
							occupiedBy = null;
							break;
					}
					space.setOccupiedBy(occupiedBy);
				}
			});
		};
		this.isAlive = ()=>_worms.includes(this);
		while(0 < startSize-1){
			startSize--;
			this.extendBody();
		}
		this.getParticipant().payload.worm = this;
	}
}
class TrailingBody extends Controllable{
	constructor(body){
		super(body);
		this.getHead = ()=>body[0];
	}
}
class Apple{
	static #idMemory = 1;
	static #placedApples = [];
	static getPlacedApples = ()=>Apple.#placedApples.slice();
	constructor(space){
		if(!space){
			throw Error('Space error.');
		}
		const ID = Apple.#idMemory++;
		Apple.#placedApples.push(space);
		this.getID = ()=>{
			return ID;
		}
		this.remove = ()=>{
			Apple.#placedApples.splice(Apple.#placedApples.indexOf(this), 1);
		}
	}
}
class Space{
	constructor(){
		const CHALLENGERS = new Array();
		const GRAVE = new Array();
		let occupiedBy = null;
		let eatables = 0;
		let apple = null;
		this.getGrave = ()=>{return GRAVE.slice()};
		this.addToGrave = controllable=>GRAVE.push(controllable);
		function willBeUnoccupied(){
			return occupiedBy === null ? true : !(occupiedBy instanceof Wall) && occupiedBy.getLength()-1 === occupiedBy.getPlace();
		}
		this.addEatable = ()=>eatables++;
		this.addChallenger = solidWorm=>CHALLENGERS.push(solidWorm);
		this.executeChallenge = ()=>{
			let unoccupied = willBeUnoccupied();
			CHALLENGERS.forEach(solidWorm => {
				if(solidWorm.getTeam() === 2){debugger}
				if(unoccupied){
					if(apple){
						this.toggleApple();
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
		this.toggleApple = ()=>{
			if(occupiedBy === null){
				if(apple){
					apple.remove();
					apple = null;
				}else{
					apple = new Apple(this);
				}
			}
		}
		this.getEatables = ()=>{
			return {apple: apple ? apple.getID() : null, other: eatables};
		}
	}
}
function callback(response){
	response.participant.payload.response = response.data;
	updateDirection(response.participant);
	response.participant.payload.wormUpdated();
}
function getPos(solidWorm){
	for(let z = 0; z < _arena.length; z++){
		let column = _arena[z];
		for(let x = 0; x < column.length; x++){
			let row = column[x];
			for(let y = 0; y < row.length; y++){
				if(solidWorm === row[y].getOccupiedBy()){
					return {z: z, x: x, y: y};
				}
			}
		}
	}
	ArenaHelper.postAbort('', 'Position of SolidWorm:'+solidWorm.getTeamNumber()+' not found.');
}
function getNextPos(pos, direction){
	switch(direction){
		case Directions.FORWARD: pos.y++; break;
		case Directions.BACKWARD: pos.y--; break;
		case Directions.RIGHT: pos.x++; break;
		case Directions.LEFT: pos.x--; break;
		case Directions.UP: pos.z++; break;
		case Directions.DOWN: pos.z--;break;
	}
	let xUnder = pos.x < 0;
	let xOver = _settings.arena.size <= pos.x;
	let yUnder = pos.y < 0;
	let yOver = _settings.arena.size <= pos.y;
	let zUnder = pos.z < 0;
	let zOver = (_settings.arena.threeDimensions ? _settings.arena.size : 1) <= pos.z;
	if(xUnder || xOver || yUnder || yOver || zUnder || zOver){
		if(_settings.arena.noBorder){
			if(xUnder){
				pos.x = _settings.arena.size-1;
			}else if(xOver){
				pos.x = 0;
			}else if(yUnder){
				pos.y = _settings.arena.size-1;
			}else if(yOver){
				pos.y = 0;
			}else if(zUnder){
				pos.z = (_settings.arena.threeDimensions ? _settings.arena.size-1 : 0);
			}else if(zOver){
				pos.z = 0;
			}
		}else{
			return null;
		}
	}
	return pos;
}
function updateDirection(participant){
	function getSelectedDirection(response){
		switch(response){
			default: debugger; ArenaHelper.log('error', 'SolidWorm:'+solidWorm.getTeam()+' has faulty direction ('+response+'), fallback to forward.');
			case 'y+': return Directions.FORWARD;
			case 'y-': return Directions.BACKWARD;
			case 'x+': return Directions.RIGHT;
			case 'x-': return Directions.LEFT;
			case 'z+': return Directions.UP;
			case 'z-': return Directions.DOWN;
		}
	}
	function rotateDirection(solidWorm, direction){
		let notAllowedDirection;
		switch(solidWorm.direction){
			case Directions.FORWARD: notAllowedDirection = Directions.BACKWARD; break;
			case Directions.BACKWARD: notAllowedDirection = Directions.FORWARD; break;
			case Directions.RIGHT: notAllowedDirection = Directions.LEFT; break;
			case Directions.LEFT: notAllowedDirection = Directions.RIGHT; break;
			case Directions.UP: notAllowedDirection = Directions.DOWN; break;
			case Directions.DOWN: notAllowedDirection = Directions.UP; break;
		}
		if(notAllowedDirection === direction){
			ArenaHelper.log('error', 'SolidWorm:'+solidWorm.getTeam()+'\'s direction ('+direction+') not allowed, fallback to forward.');
			direction = Directions.FORWARD;
		}
		switch(solidWorm.getTeam()){
			case 0: return direction;
			case 1:
				switch(direction){
					default: direction;
					case Directions.FORWARD: return Directions.BACKWARD;
					case Directions.BACKWARD: return Directions.FORWARD;
					case Directions.RIGHT: return Directions.LEFT;
					case Directions.LEFT: return Directions.RIGHT;
				}
			case 2:
				switch(direction){
					default: direction;
					case Directions.FORWARD: return Directions.RIGHT;
					case Directions.BACKWARD: return Directions.LEFT;
					case Directions.RIGHT: return Directions.BACKWARD;
					case Directions.LEFT: return Directions.FORWARD;
				}
			case 3:
				switch(direction){
					default: direction;
					case Directions.FORWARD: return Directions.LEFT;
					case Directions.BACKWARD: return Directions.RIGHT;
					case Directions.RIGHT: return Directions.FORWARD;
					case Directions.LEFT: return Directions.BACKWARD;
				}
			case 4:
				throw Error('Not yet implemented!');
				switch(direction){
					case Direction.FORWARD: return ;
					case Direction.BACKWARD: return ;
					case Direction.RIGHT: return ;
					case Direction.LEFT: return ;
					case Direction.UP: return ;
					case Direction.DOWN: return ;
				}
			case 5:
				throw Error('Not yet implemented!');
				switch(direction){
					case Direction.FORWARD: return ;
					case Direction.BACKWARD: return ;
					case Direction.getRight(): return ;
					case Direction.getLeft(): return ;
					case Direction.getUp(): return ;
					case Direction.getDown(): return ;
				}
		}
	}
	let solidWorm = participant.payload.worm;
	if(solidWorm.getTeam() === 2){debugger}
	solidWorm.direction = rotateDirection(solidWorm, getSelectedDirection(participant.payload.response));
}
function parseArena(){
	let parsedArena = [];
	_arena.forEach(c => {
		let column = [];
		parsedArena.push(column);
		c.forEach(r => {
			let row = [];
			column.push(row);
			r.forEach(space => {
				let placeable = space.getOccupiedBy();
				let occupiedBy = null;
				if(placeable !== null){
					occupiedBy = {
						type: placeable.constructor.name
					};
					if(!(placeable instanceof Wall)){
						occupiedBy.team = placeable.getTeam();
					}
				}
				row.push({
					eatables: space.getEatables(),
					occupiedBy: occupiedBy,
					grave: space.getGrave().map(placeable => {
						return {
							type: placeable.constructor.name,
							team: placeable.getTeam()
						}
					}
				)});
			});
		});
	});
	return parsedArena;
}
function tick(){
	if(_shrinkOnTick !== null){
		_ticksSinceShrink++;
		if(_shrinkOnTick === _ticksSinceShrink){
			_ticksSinceShrink = 0;
			_arena.forEach((height, heightIndex) => {
				height.forEach((column, columnIndex) => {
					column.forEach((space, rowIndex) => {
						if(columnIndex === _shrinks || columnIndex === _arena.length-1-_shrinks || rowIndex === _shrinks || rowIndex === _arena.length-1-_shrinks){
							if(space.getEatables().apple){
								space.toggleApple();
							}
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
							}
							if(occupiedBy === null || occupiedBy.constructor.name !== 'Wall'){
								space.setOccupiedBy(new Wall(space, occupiedBy));
							}
						}
					});
				});
			});
			_shrinks++;
		}
	}
	let retries = 100;
	switch(_settings.rules.apples){
		case 'FourSymmetry':
			while(0 < retries && Apple.getPlacedApples().length < 4){
				retries--;
				Apple.getPlacedApples().forEach(space => {
					space.toggleApple();
				});
				let short = Math.round(Math.random()*Math.floor(_settings.arena.size/2));
				let long = Math.round(Math.random()*Math.ceil(_settings.arena.size/2));
				_arena[short][long].toggleApple();
				_arena[_settings.arena.size-1-long][short].toggleApple();
				_arena[long][_settings.arena.size-1-short].toggleApple();
				_arena[_settings.arena.size-1-short][_settings.arena.size-1-long].toggleApple();
			}
			break;
		case 'FourRandom_asymmetric':
			while(0 < retries && Apple.getPlacedApples().length < 4){
				Apple.getPlacedApples().forEach(space => {
					space.toggleApple();
				});
				if(_arena.flat().filter(space=>space.getOccupiedBy()===null).length < 4){
					break;
				}
				while(Apple.getPlacedApples().length < 4){
					let emptySpaces = _arena.flat().filter(space=>space.getOccupiedBy()===null);
					let randomSpace = Math.floor(Math.random()*emptySpaces.length);
					emptySpaces[randomSpace].toggleApple();
				}
			}
			break;
		case 'OneRandomPerWorm_asymmetric':
			while(Apple.getPlacedApples().length < _worms.length){
				let emptySpaces = _arena[3].flat().filter(space=>space.getOccupiedBy()===null);console.log(' // TEMP: DEBUG');
				if(emptySpaces.length === 0){break;}
				let randomSpace = Math.floor(Math.random()*emptySpaces.length);
				emptySpaces[randomSpace].toggleApple();
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
			case 2: rotate = 3; break;
			case 3: rotate = 1; break;
			case 4: rotate = -1; break;
			case 5: rotate = -2; break;
		}
		for(let i = 0; i < rotate; i++){
			arenaClone = rotateArray(arenaClone);
		}
		let participant = solidWorm.getParticipant();
		participant.payload.response = null;
		participant.postMessage(parsedArena).then(callback);
		_participantPromises.push(new Promise(resolve => participant.payload.wormUpdated = resolve));
	});
	Promise.all(_participantPromises).then(()=>{
		let challengedSpaces = [];
		let borderCollisions = [];
		_worms.forEach(solidWorm => {
			let pos = getPos(solidWorm);
			if(solidWorm.getTeam() === 2){debugger}
			let posNext = getNextPos(pos, solidWorm.direction);
			if(posNext === null){
				borderCollisions.push(solidWorm);
			}else{
				let space = _arena[posNext.z][posNext.x][posNext.y];
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
	}else if(4 < _participants.countTeams() && !['FourSymmetry', 'FourRandom_asymmetric'].includes(_settings.rules.apples)){
		ArenaHelper.postAbort('', 'Can not play `FourSymmetry` or `FourRandom_asymmetric` with more than 4 participants.');
	}else{
		let shrinkSetting = _settings.arena.noBorder || _settings.rules.apples === 'AppleLess' ? -1 : _settings.rules.movesPerBorderShrink;
		if(shrinkSetting < 0){
			_shrinkOnTick = null;
		}else if(shrinkSetting === 0){
			_shrinkOnTick = _settings.arena.size;
		}else{
			_shrinkOnTick = _settings.rules.movesPerBorderShrink;
		}

		_arena = [];
		while(_arena.length < _settings.arena.size){
			let column = [];
			while(column.length < _settings.arena.size){
				let row = [];
				while(row.length < _settings.arena.size){
					row.push(new Space());
				}
				column.push(row);
			}
			_arena.push(column);
			if(!_settings.arena.threeDimensions){
				break;
			}
		}

		_coordinate_end = _settings.arena.size-1;
		_coordinate_middle = Math.floor(_coordinate_end/2);

		let solidWorm = new SolidWorm(0, Directions.FORWARD, _settings.rules.startLength);
		_arena[_settings.arena.threeDimensions ? _coordinate_middle : 0][_coordinate_middle][0].setOccupiedBy(solidWorm);
		_worms.push(solidWorm);

		solidWorm = new SolidWorm(1, Directions.BACKWARD, _settings.rules.startLength);
		_arena[_settings.arena.threeDimensions ? _coordinate_middle : 0][_coordinate_middle][_coordinate_end].setOccupiedBy(solidWorm);
		_worms.push(solidWorm);

		if(2 < _participants.countTeams()){
			solidWorm = new SolidWorm(2, Directions.RIGHT, _settings.rules.startLength);
			_arena[_settings.arena.threeDimensions ? _coordinate_middle : 0][0][_coordinate_middle].setOccupiedBy(solidWorm);
			_worms.push(solidWorm);

			solidWorm = new SolidWorm(3, Directions.LEFT, _settings.rules.startLength);
			_arena[_settings.arena.threeDimensions ? _coordinate_middle : 0][_coordinate_end][_coordinate_middle].setOccupiedBy(solidWorm);
			_worms.push(solidWorm);
		}
		if(_settings.arena.threeDimensions && 4 < _participants.countTeams()){
			solidWorm = new SolidWorm(2, Directions.A, _settings.rules.startLength);
			_arena[0][_coordinate_middle][_coordinate_middle].setOccupiedBy(solidWorm);
			_worms.push(solidWorm);

			solidWorm = new SolidWorm(3, Directions.B, _settings.rules.startLength);
			_arena[_coordinate_end][_coordinate_middle][_coordinate_middle].setOccupiedBy(solidWorm);
			_worms.push(solidWorm);
		}
		_worms_lastLength = _worms.length;
		tick();
	}
};
