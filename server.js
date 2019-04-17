const ws = require('socket.io')()
const shuffle = require('shuffle-array')

const PORT = 1337
const GRID_SIZE = 6

const ROOMS = []
const GAMES = []

const createGame = () => {
  return {
    players: [], //contains scores and id,
    grid: createGrid(), // contains the game state
    tries: [],
    turn: 0,
    started: false,
    checking: false,
  }
}

const createGrid = () => {
  let items = shuffle(
    new Array((GRID_SIZE * GRID_SIZE) / 2).fill('').reduce((a, k, i) => a.concat([i, i]), []),
  )

  const res = []
  for (let i = 0; i < GRID_SIZE; i++) {
    let col = []
    for (let j = 0; j < GRID_SIZE; j++) {
      col.push({ value: items[i * GRID_SIZE + j], returned: false })
    }
    res.push(col)
  }

  return res
}

handleClick = (game, x, y) => {
  let { grid, tries } = game
  grid[x][y].returned = true
  tries.push({ value: grid[x][y].value, x, y })

  return { ...game, grid, tries, checking: tries.length === 2 }
}

ws.on('connection', socket => {
  console.log(socket.id)

  socket.on('joinRoom', data => {
    if (ROOMS.indexOf(data.roomId) === -1) {
      const game = createGame()
      GAMES[data.roomId] = game
      ROOMS.push(data.roomId)
    }
    GAMES[data.roomId].players.push({ name: data.name, id: data.uId })
    socket.join(data.roomId)
    console.log(ROOMS, `Player ${data.name} joinded room`)
    ws.to(data.roomId).emit('sendGame', GAMES[data.roomId])
  })

  socket.on('clickCard', data => {
    if (ROOMS.indexOf(data.roomId) === -1) {
      console.log('no matching room')
      return null
    }

    const { x, y, roomId } = data
    const game = handleClick(GAMES[data.roomId], x, y)

    ws.to(roomId).emit('sendGame', game)

    console.log(game.checking)

    if (game.checking) {
      setTimeout(() => {
        let { tries, grid } = game

        // if cards does not match
        if (tries[0].value !== tries[1].value) {
          // flip all cards
          tries.forEach(t => {
            grid[t.x][t.y].returned = false
          })
        }

        // reset tries
        tries = []

        const newGame = { ...game, tries, grid, checking: false }

        GAMES[roomId] = newGame

        ws.to(roomId).emit('sendGame', newGame)
      }, 1000)
    }

    // ws.to(data.roomId).emit('sendGame', GAMES[roomId])
  })
})

ws.listen(1337)
