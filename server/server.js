var express     = require('express'),
    http        = require('http'),
    path        = require('path'),
    playerUtils = require('./playerUtils.js'),
    serverUtils = require('./serverUtils.js');
    heartsUtils = require('./heartsUtils.js');

var app = express();
var server = http.Server(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname, '../public')));

server.listen(port);

var connectedSockets = []; // keeps track of the socket.io connections

io.on('connection', function(socket) {
  console.log('Connected: ', socket.id);
  connectedSockets.push(socket.id);
  // TODO: add handling for mode selection, add mode as second argument to the following function call:
  playerUtils.newPlayer(socket.id);

  console.log("Hearts game started? "+heartsUtils.gameStarted());
  if(!heartsUtils.gameStarted()) heartsUtils.startingHearts();
  socket.emit('syncHeart', heartsUtils.getHearts());
  
  socket.on('heartKill', function(data){
    var lobbyPlayersIDs = serverUtils.getLobbyById(socket.id).getPlayerIDs();

    // Remove the heart from the source of truth 
    heartsUtils.removeHeart(data.heart);

    lobbyPlayersIDs.forEach(function(socketID){
      io.sockets.connected[socketID].emit('heartKill',{
        player:socket.id,
        heart: data.heart,
        score: data.score
      });
    });
    
    
  });

  socket.on('username', function(data) {
    playerUtils.setUsername(socket.id, data.username);
  });

  socket.on('sync', function(data) {
    playerUtils.updatePlayer(socket.id, data);
  });

  
  socket.on('death', function(data) {
    // console.log('Death: ', socket.id, 'Killed by: ', data.killer);
    playerUtils.resetKills(socket.id);
    if (data.killer !== null) playerUtils.incrementKills(data.killer);
    socket.emit('newLocation', playerUtils.getStartLoc());
  });

  // Pause and unpause players
  socket.on('pause', function() {
    playerUtils.pausePlayer(socket.id,true);
  });
  socket.on('resume', function() {
    playerUtils.pausePlayer(socket.id,false);
  });
  
  socket.on('disconnect', function() {
    console.log('Disconnected: ', socket.id);
    connectedSockets.splice(connectedSockets.indexOf(socket.id), 1);
    playerUtils.dcPlayer(socket.id);
  });
});

// Tell the player to sync with ther server every 50ms (approx 2 frames)
// SENT: a hash with player information at corresponding socketIDs
setInterval(function() {
  connectedSockets.forEach(function(socketID) {

    // Only send sync info for players that are also in the same lobby
    // as the user with socketID.
    io.sockets.connected[socketID].emit('sync', playerUtils.getPlayersByLobby(socketID));
  });
}, 50);

setInterval(function(){

}, 1000);

/*




*/