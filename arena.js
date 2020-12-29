'use strict'
let arena;
let coordinate_end;
let coordinate_middle;
let participants;
let settings;
let worms = [];
let worms_lastLength;
let _log = [];
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
		this.setSquare = space=>{
			currentSpace = space;
		}
	}
}
class Controllable extends Placeable{
	constructor(body, space=null){
		const BODY = body;
		super(space);
		if(this.constructor.name === 'Controllable'){
			throw new Error('Controllable is not constructable.');
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
		function checkIfAlive(){
			let index = worms.indexOf(this);
			if(index !== -1){
				throw new Error('SolidWorm is dead.');
			}
			return index;
		}
		this.extendBody = ()=>{
			checkIfAlive();
			BODY.push(new TrailingBody(BODY));
		}
		this.move = nextSpace=>{
			checkIfAlive();
			let space;
			BODY.forEach(part=>{
				space = part.getSpace();
				nextSpace.setOccupiedBy(part);
				nextSpace = space;
			});
			space.setOccupiedBy(null);
		}
		this.getParticipant = ()=>{
			return participants.get(team, 0);
		}
		this.getTeamNumber = ()=>team;
		this.kill = ()=>{
			worms.splice(checkIfAlive(), 1);
			BODY.forEach(part=>{
				let space = part.getSpace();
				let occupiedBy;
				switch(settings.rules.defeatedWorms){
					case 'Solid':
						team = -team - 1;
						occupiedBy = part;
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
	}
}
class TrailingBody extends Controllable{
	constructor(body){
		super(body);
	}
}
class Space{
	constructor(){
		const CHALLENGERS = new Array()
		let occupiedBy = null;
		let eatable = 0;
		this.addEatable = ()=>{
			eatable++;
		}
		this.willBeUnoccupied = ()=>{
			return occupiedBy === null ? true : occupiedBy.getLength()-1 === occupiedBy.getPlace();
		}
		this.addChallenger = solidWorm=>{
			CHALLENGERS.push(solidWorm);
		}
		this.isSingleChallenger = ()=>{
			return CHALLENGERS.length === 1;
		}
		this.killChallengers = ()=>{
			CHALLENGERS.forEach(solidWorm => {
				solidWorm.kill();
			});
		}
		this.clearChallengers = ()=>{
			while(CHALLENGERS.length){
				CHALLENGERS.pop();
			}
		}
		this.moveChallenger = ()=>{
			if(this.isSingleChallenger()){
				let solidWorm = CHALLENGERS[0];
				if(settings.rules.winner === 'MostPoints'){
					participants.addScore(solidWorm.getTeam(), eatable);
				}
				while(0 < eatable){
					eatable--;
					solidWorm.extendBody();
				}
				solidWorm.move(this);
			}else{
				throw new Error('Challenger is not alone.');
			}
		}
		this.getOccupiedBy = ()=>occupiedBy;
		this.setOccupiedBy = solidWorm=>{
			occupiedBy = solidWorm;
			if(solidWorm !== null){
				solidWorm.setSquare(this);
			}
		}
		this.getEatable = ()=>{
			return eatable;
		}
	}
}
function log(type='', value, raw=false){
	_log.push({type: type, value: raw ? value : JSON.parse(JSON.stringify(value))});
}
function callbackError(participant, messageEvent){
	console.error(participant);
	console.error(messageEvent);
}
function callback(participant, messageEvent){
	participant.payload.response = messageEvent.data;
	updateDirection(participant);
	let missingResponse = false;
	worms.forEach(solidWorm => {
		missingResponse |= solidWorm.getParticipant().payload.response === null;
	});
	if(missingResponse){
		return;
	}
	let challengedSpaces = [];
	let borderCollisions = [];
	worms.forEach(solidWorm => {
		let pos = getPos(solidWorm);
		let posNext = getNextPos(pos, solidWorm.direction);
		if(posNext === null){
			borderCollisions.push(solidWorm);
		}else{
			let space = arena[posNext[0]][posNext[1]];
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
		if(space.isSingleChallenger() && space.willBeUnoccupied()){
			space.moveChallenger();
		}else{
			space.killChallengers();
		}
		space.clearChallengers();
	});
	if(settings.rules.winner === 'LastWormStanding' && worms_lastLength !== worms.length){
		worms.forEach(solidWorm => {
			participants.addScore(solidWorm.getTeam(), 1);
		});
	}
	worms_lastLength = worms.length;
	if(0 < worms.length){
		tick();
	}else{
		postDone();
	}
}
function getPos(solidWorm){
	for(let x = 0; x < arena.length; x++){
		let array = arena[x];
		for(let y = 0; y < array.length; y++){
			if(solidWorm === array[y].getOccupiedBy()){
				return [x, y];
			}
		}
	}
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
	let b = settings.arena.size <= pos[0];
	let c = pos[1] < 0;
	let d = settings.arena.size <= pos[1];
	if(a || b || c || d){
		if(settings.arena.noBorder){
			if(a){
				pos[0] = settings.arena.size-1;
			}else if(b){
				pos[0] = 0;
			}else if(c){
				pos[1] = settings.arena.size-1;
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
		log('error', solidWorm.getTeam() + ' Faulty direction, keep previous.');
	}else{
		solidWorm.direction = nextDirection;
	}
}
function parseArena(){
	let _arena = [];
	arena.forEach(column => {
		let _column = [];
		_arena.push(_column);
		column.forEach(square => {
			let occupiedBy = square.getOccupiedBy();
			_column.push({eatables: square.getEatable(), occupiedBy: occupiedBy === null ? null : {team: occupiedBy.getTeam(), head: occupiedBy.constructor.name === 'SolidWorm'}});
		});
	});
	return _arena;
}
function tick(){
	let parsedArena = parseArena();
	log('tick', parsedArena);
	worms.forEach(solidWorm => {
		solidWorm.getParticipant().payload.response = null;
	});
	participants.postToAll(parsedArena);
}
function postDone(){
	log('tick', parseArena());
	postMessage({type: 'Done', message: {score: participants.getScores(), settings: participants.getSettings(), log: _log}});
}
function postAbort(participant='', error=''){
	let participantName = participant.name === undefined ? participant : participant.name;
	postMessage({type: 'Aborted', message: {participantName: participantName, error: error}})
}
onmessage = messageEvent => {
	importScripts(messageEvent.data.ArenaHelper_url);
	settings = messageEvent.data.settings;
	if(messageEvent.data.participants.length%2 !== 0){
		postAbort('', 'Uneven amount of teams is not supported.');
	}else if(settings.arena.size%2 !== 1){
		postAbort('', 'Arena size has to be uneven.');
	}else if(settings.rules.winner === 'MostPoints' && settings.rules.defeatedWorms !== 'Solid'){
		postAbort('', 'Incompatible rules: MostPoints can only be played with Solid.');
	}else if(!settings.arena.threeDimensions && 4 < messageEvent.data.participants.length){
		postAbort('', '`threeDimensions` is required for more than 4 participants.');
	}else if(settings.arena.threeDimensions){
		postAbort('', '`threeDimensions` is currently not supported.');
	}else{
		arena = [];
		while(arena.length < settings.arena.size){
			let column = [];
			while(column.length < settings.arena.size){
				column.push(new Space());
			}
			arena.push(column);
		}
		
		coordinate_end = settings.arena.size-1;
		coordinate_middle = Math.floor(coordinate_end/2);

		let solidWorm = new SolidWorm(0, Direction.getUp());
		arena[coordinate_middle][0].setOccupiedBy(solidWorm);
		worms.push(solidWorm);

		solidWorm = new SolidWorm(1, Direction.getDown());
		arena[coordinate_middle][coordinate_end].setOccupiedBy(solidWorm);
		worms.push(solidWorm);

		if(2 < messageEvent.data.participants.length){
			solidWorm = new SolidWorm(2, Direction.getLeft())
			arena[0][coordinate_middle].setOccupiedBy(solidWorm);
			worms.push(solidWorm);

			solidWorm = new SolidWorm(3, Direction.getRight())
			arena[coordinate_end][coordinate_middle].setOccupiedBy(solidWorm);
			worms.push(solidWorm);
		}
		worms_lastLength = worms.length;
		participants = new ArenaHelper.Participants(messageEvent.data, ()=>{
			worms.forEach(solidWorm => {
				solidWorm.getParticipant().payload.worm = solidWorm;
			});
			onmessage = messageEvent => {
				if(messageEvent.data === 'Start'){
					participants.addCallbackToAll(callback, callbackError);
					tick();
				}
			}
			postMessage({type: 'Ready-To-Start', message: null});
		}, error => {
			postAbort('Did-Not-Start', error);
		}, (participantName, error) => postAbort(participantName, error));
	}
}
