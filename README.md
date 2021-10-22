# Worm-Arena
Worm is a [Snake](https://en.wikipedia.org/wiki/Snake_(video_game_genre)) like arena.
Click the image below to join the official Discord channel.
<br>[![Discord banner2](https://discord.com/api/guilds/765291928454823936/widget.png?style=banner2)](https://discord.gg/wtFvtECqSX)

Participants receives a multidimensional array representing the current state of the arena and responds with the direction the worm should travel next. Possible responses are `'x+'`, `'x-'`, `'y+'`, `'y-'`, `'z-'` and `'z+'`. Responding with a invalid move (like turning backwards) results in moving forward.

**Message example**
``` JavaScript
[[[{"eatables":{"apple":null,"other":0},"occupiedBy":null,"grave":[]},{"eatables":{"apple":4,"other":0},"occupiedBy":null,"grave":[]},{"eatables":{"apple":null,"other":0},"occupiedBy":{"type":"SolidWorm","team":3,"isLastTrailingBody":false},"grave":[]},{"eatables":{"apple":null,"other":0},"occupiedBy":null,"grave":[]},{"eatables":{"apple":null,"other":0},"occupiedBy":null,"grave":[]}],[{"eatables":{"apple":null,"other":0},"occupiedBy":null,"grave":[]},{"eatables":{"apple":null,"other":0},"occupiedBy":null,"grave":[]},{"eatables":{"apple":null,"other":0},"occupiedBy":null,"grave":[]},{"eatables":{"apple":null,"other":0},"occupiedBy":null,"grave":[]},{"eatables":{"apple":2,"other":0},"occupiedBy":null,"grave":[]}],[{"eatables":{"apple":null,"other":0},"occupiedBy":{"type":"SolidWorm","team":1,"isLastTrailingBody":false},"grave":[]},{"eatables":{"apple":null,"other":0},"occupiedBy":null,"grave":[]},{"eatables":{"apple":null,"other":0},"occupiedBy":null,"grave":[]},{"eatables":{"apple":null,"other":0},"occupiedBy":null,"grave":[]},{"eatables":{"apple":null,"other":0},"occupiedBy":{"type":"SolidWorm","team":0,"isLastTrailingBody":false},"grave":[]}],[{"eatables":{"apple":3,"other":0},"occupiedBy":null,"grave":[]},{"eatables":{"apple":null,"other":0},"occupiedBy":null,"grave":[]},{"eatables":{"apple":null,"other":0},"occupiedBy":null,"grave":[]},{"eatables":{"apple":null,"other":0},"occupiedBy":null,"grave":[]},{"eatables":{"apple":null,"other":0},"occupiedBy":null,"grave":[]}],[{"eatables":{"apple":null,"other":0},"occupiedBy":null,"grave":[]},{"eatables":{"apple":null,"other":0},"occupiedBy":null,"grave":[]},{"eatables":{"apple":null,"other":0},"occupiedBy":{"type":"SolidWorm","team":2,"isLastTrailingBody":false},"grave":[]},{"eatables":{"apple":1,"other":0},"occupiedBy":null,"grave":[]},{"eatables":{"apple":null,"other":0},"occupiedBy":null,"grave":[]}]]]
```
Note that `eatables.apple` can either be `null` or a number. The number only represent an ID and is always only worth one point. When a worm is defeated and leaves eatables behind, they are put into `eatables.other`.

**Eatable example**
``` JavaScript
{"eatables":{"apple":0,"other":0}}
```

## Configurations
*Basic description of each parameter. Some parameter combinations is incompatible. Read more at the arena.*
| Scope | Value | Description |
| --- | --- |---|
| `arena` | `size` | Defines the size (length of each side) of the arena. |
| `arena` | `threeDimensions` | If enable the size of the arena is `size*size*size` instead of `size*size`. |
| `border` | `noBorder` | If enable the worm will appear of the opposite side of the arena instead of colliding with a wall. |
| `border` | `movesPerArenaShrink` | How many moves a worm can make before the arena shrinks. |
| `border` | `shrinkMode` | • `RandomPlacedWall_single`<br>A random wall is placed anywhere on the arena. <br>• `RandomPlacedWall_fourSymmetry`<br>Four walls are placed symmetrically on the arena. <br>• `RandomPlacedWall_perWorm`<br>One random wall pere living worm is placed anywhere on the arena. <br>• `WallOuterArea`<br>Playable arena shrinks my placing a wall on the most outer sides. |
| `rules` | `startLength` | How long the worm will start as. |
| `rules` | `apples` | How many apples is located at the arena and how they are placed. |
| `rules` | `defeatedWorms` | What will happen to a defeated worm.<br>• `Disappears`<br>Defeated worms are removed.<br>• `Eatable`<br>Defeated worms becomes eatable for extra points.<br>• `Solid`<br>Defeated worms turns into a wall. |
| `rules` | `winner` | • `LastWormStanding`<br>Participants that are alive receive one point each time a worm is defeated. <br>• `MostPoints`<br>Participants receive one point for every eaten object until there is no more worms alive.|
