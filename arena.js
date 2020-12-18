'use strict'
importScripts('https://ai-tournaments.github.io/AI-Tournaments/Arena/Participants.js');
importScripts('https://chrisacrobat.github.io/js-compilation/CreateWorkerFromRemoteURL.js');
let arena;
let coordinate_end;
let coordinate_middle;
let participants;
let settings;
let worms = [];
let _log = [];
let _locked = false;
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
class placeable{
	constructor(square=null){
		let currentSquare = square;
		this.#checkCurrentSquare = ()=>{
			if(currentSquare === null && this.constructor.name === 'SolidWorm'){
				throw new Error('SolidWorm has to be placed.');
			}
		}
		this.getSquare = ()=>{
			this.#checkCurrentSquare();
			return currentSquare;
		}
	}
}
class SolidWorm extends placeable{
	constructor(team=-1, direction=new Direction()){
		const BODY = new Array(this);
		let _team = team;
		super();
		this.direction = direction;
		this.extendBody = ()=>{
			BODY.push(new TrailingBody(BODY));
		}
		this.getTeam = ()=>{
			return _team;
		}
		this.move = nextSquare=>{
			let square;
			BODY.forEach(part=>{
				square = part.getSquare();
				nextSquare.occupiedBy = part;
				nextSquare = square;
			});
			square.occupiedBy = null;
		}
		this.getParticipant = ()=>{
			return participants.get(_team, 0);
		}
	}
}
class TrailingBody extends placeable{
	constructor(body){
		const BODY = body;
		super();
		this.getPlace = () => {
			return BODY.indexOf(this);
		}
	}
}
class Space{
	constructor(){
		const CHALLENGERS = new Array()
		let occupiedBy = null;
		let eatable = 0;
		this.willBeUnoccupied = ()=>{};
		this.addChallenger = solidWorm=>{
			CHALLENGERS.push(solidWorm);
		}
		this.isSingleChallenger = ()=>{
			return CHALLENGERS.length === 1;
		}
		this.moveChallenger = ()=>{
			if(this.isSingleChallenger()){
				let solidWorm = CHALLENGERS[0];
				while(0 < eatable){
					eatable--;
					solidWorm.extendBody();
				}
				solidWorm.move(this);
			}else{
				throw new Error('Challenger is not alone.');
			}
		}
		this.setOccupiedBy = solidWorm=>{
			if(_locked){
				throw new Error('Set .occupiedBy is locked, only .moveChallenger() is available.');
			}else{
				this.occupiedBy = solidWorm;
				solidWorm.currentSquare = this;
			}
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
	updateDirection(participant, messageEvent.data);
	let missingResponse = false;
	worms.forEach(solidWorm => {
		missingResponse |= solidWorm.getParticipant().payload.response === null;
	});
	if(missingResponse){
		return;
	}
	let parkerSquare = [];
	worms.forEach(solidWorm => {
		let pos = getPos(solidWorm);
		let posNext = getNextPos(pos, solidWorm.direction);
		let space = arena[posNext[0], posNext[1]];
		if(space.occupiedBy === null || space.willBeUnoccupied()){
			space.addChallenger(solidWorm);
			if(!parkerSquare.includes(space)){
				parkerSquare.push(space);
			}
		}
	});
	for(let square in parkerSquare){
		if(square.isSingleChallenger()){
			square.moveChallenger();
		}
	}
	tick();
}
function getPos(solidWorm){
	for(let x = 0; x < arena.length; x++){
		let array = arena[x];
		for(let y = 0; y < array; y++){
			if(solidWorm === object){
				return [x, y];
			}
		}
	}
}
function getNextPos(pos, direction){
	if(settings.arena.noBorder){
		switch(direction){
			case Direction.getUp(): ; break;
			case Direction.getDown(): ; break;
			case Direction.getLeft(): ; break;
			case Direction.getRight(): ; break;
		}
	}else{
		switch(direction){
			case Direction.getUp(): ; break;
			case Direction.getDown(): ; break;
			case Direction.getLeft(): ; break;
			case Direction.getRight(): ; break;
		}
	}
}
function updateDirection(participant, choice){
	let nextDirection = null;
	let solidWorm = participant.payload.worm;
	switch(choice){
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
		log('error', solidWorm.getTeam() + ' Faulty direction, default to forward.');
	}
	solidWorm.direction = nextDirection;
}
function tick(){
	log('tick', arena);
	worms.forEach(solidWorm => {
		solidWorm.getParticipant().payload.response = null;
	});
	participants.postToAll(arena);
}
function postDone(participants, log){
	log('tick', arena);
	postMessage({type: 'Done', message: {score: participants.getScores(), settings: participants.getSettings(), log: log}});
}
function postAbort(participant='', error=''){
	let participantName = participant.name === undefined ? participant : participant.name;
	postMessage({type: 'Aborted', message: {participantName: participantName, error: error}})
}
onmessage = messageEvent => {
	settings = messageEvent.data.settings;
	if(messageEvent.data.participants.length%2 !== 0){
		postAbort('', 'Uneven amount of teams is not supported.');
	}else if(settings.arena.size%2 !== 1){
		postAbort('', 'Arena size has to be uneven.');
	}else if(settings.arena.threeDimensions){
		postAbort('', '`threeDimensions` is currently not supported.');
	}else{
		arena = new Array(settings.arena.size).fill(new Array(settings.arena.size).fill(new Space()));
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
		_locked = true;
		participants = new Participants(messageEvent.data, ()=>{
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
