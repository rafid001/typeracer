# TypeRacer Clone

A modern, real-time typing game where players can compete against each other to see who can type the fastest.

<video src="https://www.youtube.com/watch?v=rTddvDdfsP8" width="320" height="240" controls></video>

## Features

- **Multiplayer Racing**: Compete in real-time with friends or strangers
- **Single Player Practice**: Hone your typing skills in practice mode
- **Live WPM Tracking**: See your words-per-minute update in real-time
- **Detailed Statistics**: View accuracy, consistency, and character analysis after each race
- **Shareable Game Codes**: Easily invite friends with unique game IDs
- **Live Leaderboards**: Track player positions during and after races
- **Cross-browser Compatible**: Works on all modern browsers

## Technology Stack

- **Frontend**: Next.js, TypeScript, Socket.io-client, Tailwind CSS
- **Backend**: Node.js, Socket.io, TypeScript
- **Deployment**: Vercel (frontend), Railway (backend)

## How to Play

1. Choose between single player practice or multiplayer race
2. For multiplayer, create a new race or join an existing one with a game code
3. Share the game code with friends to invite them
4. Wait for the host to start the race
5. Type as quickly and accurately as possible
6. Compare your results with other players

## Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/typeracer.git

# Install dependencies
cd typeracer
npm install

# Start development servers
npm run dev
```

## Project Structure

```
typeracer/
├── apps/
│   ├── server/          # Backend Socket.io server
│   │   ├── classes/     # Game logic and player management
│   │   ├── utils/       # Helper functions
│   │   └── index.ts     # Server entry point
│   └── web/             # Next.js frontend
│       ├── app/         # Page routes
│       ├── components/  # React components
│       ├── public/      # Static assets
│       └── types/       # TypeScript type definitions
├── package.json
└── README.md
```

## Game Mechanics

- Players type a randomly generated paragraph
- Score is based on correctly typed words
- WPM (Words Per Minute) updates in real-time
- The game ends after 60 seconds
- Players can see their ranking on the leaderboard
- Detailed statistics are shown after each race

## Technical Implementation Highlights

### WPM Calculation and Display

The application calculates WPM in real-time using the formula:

- WPM = (correct characters / 5) / minutes elapsed

Recent improvements to WPM display include:

- Added a clear WPM display in the multiplayer race results table with font-bold and text-lg styling
- Used a more reliable check with player.wpm !== undefined instead of the falsy check that could ignore legitimate zero values
- Added debug logging to help trace the WPM values at the end of a race
- Added a 500ms delay when calculating detailed stats to ensure all final player score updates are received
- Updated the header to show "WPM" in uppercase and bold
- Ensured the multiplayer mode gets the server's WPM value for the current player

These changes ensure that WPM values are properly displayed in all views at the end of the race, even if there were timing issues with receiving the final updates.

### Real-time Communication

- Socket.io is used for bidirectional communication between client and server
- The server broadcasts score updates to all players in a game room
- Custom events track typing progress, game state, and player connections
- Players see immediate feedback on their own performance and others' progress

## Future Improvements

- User accounts and persistent statistics
- More game modes (e.g., challenges, tournaments)
- Customizable themes and keyboard layouts
- Mobile-friendly design
- Internationalization support

## Contributing

Contributions are welcome! Feel free to submit a pull request or open an issue for bug reports and feature requests.

## License

MIT
