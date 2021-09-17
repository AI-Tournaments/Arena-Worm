# Worm-Arena
A [Snake](https://en.wikipedia.org/wiki/Snake_(video_game_genre)) like arena.
Click image below to join the official Discord channel.
<br>[![Discord banner2](https://discord.com/api/guilds/765291928454823936/widget.png?style=banner2)](https://discord.gg/wtFvtECqSX)

## Rules
You will receive an array representing the gameboard. You receive one point for every eaten object, or if you are the `LastWormStanding`. You will start in the lower middle, facing up. Valid responses are `-1` for turning left, `0` for moving strait forward and `1` for turning right. Also if `threeDimensions` is enabled (currently disabled): `'-i'` for turning down and `'i'` for turning up.

### Disqualifications
Violating any of this will lead to DNF (Did-Not-Finish), aborted game and disqualification from the running tournament.
- Caught exceeding the time limit (`timelimit_ms`) for tick execution defined by the tournament.
- Respond with invalid response.
