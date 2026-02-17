# Game Achievement Integration Guide

## Overview
This guide shows how to integrate game achievements with ChainBadger badges.

## Architecture

```
Game Platform (Steam/Epic/etc.)
    ↓
User Earns Achievement
    ↓
User Submits Proof to ChainBadger
    ↓
Backend Verifies with Game API
    ↓
Backend Signs Badge Claim
    ↓
User Claims Badge On-Chain
```

## Integration Methods

### 1. Steam Integration

**Setup:**
1. Get Steam Web API Key: https://steamcommunity.com/dev/apikey
2. Add to `.env.local`: `STEAM_API_KEY=your_key_here`

**Verification Code:**
```typescript
async function verifySteamAchievement(
  steamId: string,
  appId: string,
  achievementName: string
): Promise<boolean> {
  const apiKey = process.env.STEAM_API_KEY;
  const url = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?appid=${appId}&key=${apiKey}&steamid=${steamId}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  const achievement = data.playerstats.achievements.find(
    (a: any) => a.apiname === achievementName
  );
  
  return achievement?.achieved === 1;
}
```

**Badge Config:**
```typescript
{
  badgeId: 6,
  gameId: "steam",
  achievementId: "ACHIEVEMENT_API_NAME",
  appId: "730", // CS:GO example
  proof: {
    steamId: "76561198000000000"
  }
}
```

### 2. Epic Games Integration

**Setup:**
1. Register your app at Epic Developer Portal
2. Get OAuth credentials
3. Add to `.env.local`: `EPIC_CLIENT_ID=xxx` and `EPIC_CLIENT_SECRET=xxx`

**Verification Code:**
```typescript
async function verifyEpicAchievement(
  epicAccountId: string,
  achievementName: string
): Promise<boolean> {
  // 1. Get access token
  const tokenResponse = await fetch('https://api.epicgames.dev/epic/oauth/v1/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${process.env.EPIC_CLIENT_ID}:${process.env.EPIC_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  
  const { access_token } = await tokenResponse.json();
  
  // 2. Check achievement
  const achievementResponse = await fetch(
    `https://api.epicgames.dev/epic/achievements/v1/${epicAccountId}/achievements`,
    {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    }
  );
  
  const achievements = await achievementResponse.json();
  return achievements.some((a: any) => a.achievementName === achievementName && a.progress === 100);
}
```

### 3. Custom Game Integration

For your own game backend:

**Game Backend Endpoint:**
```typescript
// Your game server
app.post('/api/verify-achievement', async (req, res) => {
  const { playerId, achievementId, signature } = req.body;
  
  // Verify player identity and achievement
  const player = await db.players.findOne({ id: playerId });
  const hasAchievement = player.achievements.includes(achievementId);
  
  res.json({ verified: hasAchievement });
});
```

**ChainBadger Integration:**
```typescript
async function verifyCustomGameAchievement(
  playerId: string,
  achievementId: string,
  playerSignature: string
): Promise<boolean> {
  const response = await fetch('https://yourgame.com/api/verify-achievement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerId,
      achievementId,
      signature: playerSignature
    })
  });
  
  const { verified } = await response.json();
  return verified;
}
```

### 4. Chainlink Integration (Decentralized)

For fully on-chain verification:

```solidity
// GameAchievementVerifier.sol
contract GameAchievementVerifier {
    using Chainlink for Chainlink.Request;
    
    function verifyAchievement(
        string memory playerId,
        string memory achievementId,
        string memory apiUrl
    ) public returns (bytes32 requestId) {
        Chainlink.Request memory req = buildChainlinkRequest(
            jobId,
            address(this),
            this.fulfill.selector
        );
        
        req.add("get", string(abi.encodePacked(apiUrl, "?player=", playerId)));
        req.add("path", string(abi.encodePacked("achievements.", achievementId)));
        
        return sendChainlinkRequest(req, fee);
    }
    
    function fulfill(bytes32 _requestId, bool _verified) public recordChainlinkFulfillment(_requestId) {
        if (_verified) {
            // Grant badge claim rights
        }
    }
}
```

## Frontend Component

Create a component for game achievement claims:

```typescript
// GameAchievementClaim.tsx
export const GameAchievementClaim = ({ badgeId, gameId, achievementId }) => {
  const [proof, setProof] = useState({});
  
  const handleClaim = async () => {
    // Get proof (Steam ID, Epic ID, etc.)
    const response = await fetch('/api/verify-game-achievement', {
      method: 'POST',
      body: JSON.stringify({
        user: address,
        badgeId,
        gameId,
        achievementId,
        proof,
        chainId,
        verifyingContract
      })
    });
    
    const { signature } = await response.json();
    
    // Submit to contract
    await claimBadge(badgeId, signature);
  };
  
  return (
    <div>
      <h3>Game Achievement Required</h3>
      <p>Complete "{achievementId}" in {gameId}</p>
      <input 
        placeholder="Enter your Steam/Epic ID"
        onChange={e => setProof({ playerId: e.target.value })}
      />
      <button onClick={handleClaim}>Verify & Claim</button>
    </div>
  );
};
```

## Security Considerations

1. **API Keys**: Never expose API keys in frontend
2. **Rate Limiting**: Prevent spam verification requests
3. **Caching**: Cache verification results to avoid API abuse
4. **Proof of Ownership**: Require users to prove game account ownership
5. **Time Limits**: Add expiration to signed claims

## Adding New Game Badges

1. **Update Badge Requirements** in `verify-game-achievement/route.ts`:
```typescript
const BADGE_REQUIREMENTS: Record<number, GameRequirement> = {
  9: {
    gameId: "steam",
    achievementId: "SPEEDRUN_MASTER",
    appId: "730",
    description: "Complete speedrun in CS:GO"
  }
};
```

2. **Deploy New Badge** via deployment script or admin panel

3. **Users Claim** by providing game proof

## Example: Steam Achievement Badge

**User Flow:**
1. User completes achievement in Steam game
2. User enters Steam ID on ChainBadger
3. Backend calls Steam API to verify
4. Backend signs claim if verified
5. User claims badge on-chain

**Code:**
Already implemented in `/api/verify-game-achievement/route.ts`!

## Testing

Mock verification for development:
```typescript
// In .env.local
MOCK_GAME_VERIFICATION=true

// In verify-game-achievement/route.ts
if (process.env.MOCK_GAME_VERIFICATION === 'true') {
  return true; // Auto-approve for testing
}
```

## Next Steps

1. Choose your game platform(s)
2. Get API credentials
3. Implement verification function
4. Add badge requirements
5. Create UI for achievement claims
6. Test with real game accounts
