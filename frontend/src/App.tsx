import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const COOLDOWN_API = 'https://your-ngrok-url.ngrok-free.app/check-cooldown';

export default function ClaimPMH() {
  const [address, setAddress] = useState('');
  const [cooldown, setCooldown] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkCooldown = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch(`${COOLDOWN_API}?address=${address}`);
      const data = await res.json();
      setCooldown(data);
    } catch (err) {
      console.error('Failed to check cooldown', err);
      setCooldown(null);
    }
    setLoading(false);
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-xl font-bold">PMH Claim Checker</h2>

          <Input
            placeholder="Enter wallet address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <Button onClick={checkCooldown} disabled={loading || !address}>
            {loading ? 'Checking...' : 'Check Claim Status'}
          </Button>

          {cooldown && (
            <div className="text-sm mt-4">
              <p><strong>Address:</strong> {cooldown.address}</p>
              <p>
                <strong>Status:</strong>{' '}
                {cooldown.canClaim ? '✅ You can claim now!' : `⏳ ${formatTime(cooldown.cooldownSeconds)} remaining`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
