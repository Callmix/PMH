// pages/index.js
import { useEffect, useState } from 'react';
import { useAccount, useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ethers } from 'ethers';

const PMH_CONTRACT = '0x1CA466c720021ACf885370458092BdD8De48FE01';
const ABI = [
  "function claim()",
  "function balanceOf(address) view returns (uint256)"
];

const BACKEND_API = 'https://your-ngrok-url.ngrok-free.app/check-cooldown';

export default function Home() {
  const { address, isConnected } = useAccount();
  const [cooldown, setCooldown] = useState(null);
  const [fetchingCooldown, setFetchingCooldown] = useState(false);

  const { data: balance } = useContractRead({
    address: PMH_CONTRACT,
    abi: ABI,
    functionName: 'balanceOf',
    args: [address],
    watch: true,
    enabled: !!address
  });

  const { write: claim, data: claimTx, isLoading: claiming } = useContractWrite({
    address: PMH_CONTRACT,
    abi: ABI,
    functionName: 'claim',
  });

  const { isSuccess: claimConfirmed } = useWaitForTransaction({
    hash: claimTx?.hash,
  });

  useEffect(() => {
    if (!address) return;
    setFetchingCooldown(true);
    fetch(`${BACKEND_API}?address=${address}`)
      .then(res => res.json())
      .then(data => setCooldown(data))
      .catch(err => console.error(err))
      .finally(() => setFetchingCooldown(false));
  }, [address, claimConfirmed]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen p-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">PMH Claim App</h1>

      <ConnectButton />

      {isConnected && (
        <>
          <div className="text-sm text-gray-700">
            <p><strong>Address:</strong> {address}</p>
            <p><strong>Balance:</strong> {balance ? ethers.utils.formatUnits(balance, 18) : '0'} PMH</p>
          </div>

          <div className="mt-4">
            <button
              onClick={() => claim?.()}
              disabled={!cooldown?.canClaim || claiming}
              className="bg-blue-600 text-white py-2 px-4 rounded disabled:bg-gray-400"
            >
              {claiming ? 'Claiming...' : 'Claim PMH'}
            </button>
            {cooldown && !cooldown.canClaim && (
              <p className="text-xs mt-2 text-red-600">
                Cooldown active: {formatTime(cooldown.cooldownSeconds)} left
              </p>
            )}
          </div>

          {claimConfirmed && (
            <p className="text-green-600 text-sm mt-4">Claim successful!</p>
          )}
        </>
      )}
    </div>
  );
}
