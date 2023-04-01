'use strict';

function is(arg, MatchClass) {
	return arg instanceof MatchClass
}
function vector(x=0, y=0) {
	return new Vector(x, y)
}
class Vector {
	constructor(x, y) {
		this.x = x || 0;
		this.y = y || 0;
	}

	plus(v) {
		if (is(v, Vector)) {
			return new Vector(this.x + v.x, this.y + v.y)
		} else {
			throw new TypeError('Vector expected.')
		}
	}

	times(m) {
		return new Vector(this.x*m, this.y*m)
	}

	isEqual(v) {
		if (is(v, Vector)) {
			return this.x  === v.x && this.y ===  v.y
		} else {
			throw new TypeError('Vector expected.')
		}
	}

	toString() {
		return `${this.x.toFixed(1)} : ${this.y.toFixed(1)}`
	}

	get [Symbol.toStringTag]() {
		return 'Vector'
	} 
}

class Actor {
	constructor(pos = vector(), size = vector(1, 1), speed = vector()) {
		if (Array.from(arguments).some(arg=>arg !== undefined && !is(arg, Vector))) {
			throw new TypeError('Vector expected.');
		}

		this.pos = pos;
		this.size = size;
		this.speed = speed;
	}

	isIntersect(actor) {
		if (!is(actor, Actor)) {
			throw new TypeError('Actor expected.')
		}
		if (actor === this) {
			return false
		}

		return (this.top >= actor.bottom || actor.top >= this.bottom)
		|| (this.left >= actor.right || actor.left >= this.right)
		? false : true;
	}

	act() {}

	get top() {
		return this.pos.y
	}

	get bottom() {
		return this.pos.y + this.size.y
	}

	get left() {
		return this.pos.x
	}

	get right() {
		return this.pos.x + this.size.x
	}

	get type() {
		return 'actor'
	}

	static get type() {
		return 'Actor'
	}

	get [Symbol.toStringTag]() {
		return 'Actor'
	}

	posToStr() {
		return ['left', 'top', 'right', 'bottom']
		.map(side => `${side}: ${this[side]}`)
		.join(', ');  
	}

}

class Level {
	constructor(grid, actors) {
		this.grid = grid || [];
		this.actors = actors || [];
		this.player = this.actors.find(actor=>actor.type === 'player');
		this.height = this.grid.length;
		this.width = this.grid.reduce((width, row)=>Math.max(width, row.length), 0);
		this.status = null;
		this.finishDelay = 1;
	}

	isFinished() {
		return this.status !== null && this.finishDelay < 0;
	}

	actorAt(actor) {
		if (!is(actor, Actor)) {
			throw new TypeError('Actor expected.')
		}
		return this.actors.find(item=>item.isIntersect(actor))
	}

	obstacleAt(pos, size) {
		if (Array.from(arguments).some(arg=>!is(arg, Vector))) {
			throw new TypeError('Vector expected.');
		}
		const actor = new Actor(pos, size);
		if (actor.left < 0 || actor.right > this.width || actor.top < 0) {
			return 'wall'
		} else if (actor.bottom > this.height) {
			return 'lava'
		}
		for (let y = parseInt(actor.top); y < actor.bottom; y++) {
			for (let x = parseInt(actor.left); x < actor.right; x++) {
				if (this.grid[y][x]) {
					return this.grid[y][x]
				}
			}
		}
	}

	removeActor(actor) {
		const index = this.actors.indexOf(actor);
		return index > -1 && this.actors.splice(index, 1)
	}

	noMoreActors(type) {
		return !this.actors.some(actor=>actor.type === type)
	}

	playerTouched(type, actor) {
		if (type === 'lava' || type === 'fireball') {
			this.status = 'lost'
		} else if (type === 'coin') {
			this.removeActor(actor);
			if (this.noMoreActors('coin')) {
				this.status = 'won'
			}
		}
	}
}

class LevelParser {
	constructor(dict) {
		this.dictionary = dict || {};
	}

	actorFromSymbol(key) {
		return this.dictionary[key]
	}

	obstacleFromSymbol(key) {
		return {
			"x": 'wall',
			"!": 'lava',
		}[key]
	}

	createGrid(schema) {
		return schema.map(row=>{
			return Array.from(row)
			.map(item=>this.obstacleFromSymbol(item))
		})
	}

	createActors(schema) {
		const actors = [];
		schema.forEach((row, rowIndex)=>{
			return Array.from(row)
			.forEach((item, itemIndex)=>{
				const ActorClass = this.actorFromSymbol(item);
				typeof ActorClass === 'function' && ActorClass.type === 'Actor'
				&& actors.push(new ActorClass(vector(itemIndex, rowIndex)))
			})
		})
		return actors
	}

	parse(schema) {
		return new Level(this.createGrid(schema), this.createActors(schema))
	}
}

class Fireball extends Actor{
	constructor(pos = vector(), speed = vector()) {
		super(pos, vector(1, 1), speed)
	}

	getNextPosition(time = 1) {
		return this.pos.plus(this.speed.times(time))
	}

	handleObstacle() {
		this.speed = this.speed.times(-1)
	}

	act(time, level) {
		const pos = this.getNextPosition(time);
		if (level.obstacleAt(pos, this.size)) {
			this.handleObstacle()
		} else {
			this.pos = pos
		}
	}

	get type() {
		return 'fireball'
	} 

	get [Symbol.toStringTag]() {
		return 'Fireball'
	} 
}

class HorizontalFireball extends Fireball{
	constructor(pos = vector()) {
		super(pos, vector(2, 0))
	}

	get [Symbol.toStringTag]() {
		return 'HorizontalFireball'
	} 
}

class VerticalFireball extends Fireball{
	constructor(pos = vector()) {
		super(pos, vector(0, 2))
	}

	get [Symbol.toStringTag]() {
		return 'VerticalFireball'
	} 
}


class FireRain extends Fireball{
	constructor(pos = vector()) {
		super(pos, vector(0, 3));
		this.startPos = pos;
	}

	handleObstacle() {
		this.pos = this.startPos
	}

	get [Symbol.toStringTag]() {
		return 'FireRain'
	} 
}

class Coin extends Actor {
	constructor(pos = vector(0, 0)) {
		pos = pos.plus(vector(0.2, 0.1));
		super(pos, vector(0.6, 0.6));
		this.basePos = pos;
		this.springSpeed = 8;
		this.springDist = 0.07;
		this.spring = 2*Math.PI*Math.random();
	}

	updateSpring(time = 1) {
		this.spring += this.springSpeed*time;
	}

	getSpringVector() {
		return vector(0, Math.sin(this.spring)*this.springDist)
	}

	getNextPosition(time = 1) {
		this.updateSpring(time);
		return this.basePos.plus(this.getSpringVector())
	}

	act(time) {
		this.pos = this.getNextPosition(time)
	}

	get type() {
		return 'coin'
	}
}

class Player extends Actor {
	constructor(pos = vector(0, 0)) {
		super(pos.plus(vector(0, -0.5)), vector(0.8, 1.5), vector(0, 0))
	}

	get type() {
		return 'player'
	}
}


const actorDict = {
	"@": Player,
	"o": Coin,
	"=": HorizontalFireball,
	"|": VerticalFireball,
	"v": FireRain,
};
const parser = new LevelParser(actorDict);

loadLevels()
.then(res=>JSON.parse(res))
.then(levels=>runGame(levels, parser, DOMDisplay))
.then(result=>alert(result))
