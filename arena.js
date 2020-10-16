'use strict'
importScripts('https://ai-tournaments.github.io/AI-Tournaments/Arena/participants.js');
importScripts('https://chrisacrobat.github.io/js-compilation/CreateWorkerFromRemoteURL.js');
function postDone(participants, log){
	postMessage({type: 'Done', message: {score: participants.getScores(), settings: participants.getSettings(), log: log}});
}
function postAbort(participant, error){
	let participantName = participant.name === undefined ? participant : participant.name;
	postMessage({type: 'Aborted', message: {participantName: participantName, error: error}})
}
onmessage = messageEvent => {
	new Participants(messageEvent.data, ()=>{
		onmessage = messageEvent => {
			if(messageEvent.data === 'Start'){
				/* Ready. Set. Go! */;
			}
		}
		postMessage({type: 'Ready-To-Start', message: null});
	}, error => {
		postAbort('Did-Not-Start', error);
	}, (participantName, error) => postAbort(participantName, error));
}
