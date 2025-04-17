import { useState, useEffect } from "react";
import { Contract } from "ethers";
import { useWallet } from "@worldcoin/idkit"; // or your wallet hook
import abi from "./abi.json";

const contractAddress = "0x1CA466c720021ACf885370458092BdD8De48FE01";
const alchemyUrl = process.env.REACT_APP_ALCHEMY_URL; // Use environment variable

export default function ClaimButton() {
  const { provider, address } = useWallet();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [canClaim, setCanClaim] = useState(true);
  const [transfers, setTransfers] = useState([]);

  const fetchTransfers = async (userAddress) => {
    try {
      const body = JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "alchemy_getAssetTransfers",
        params: [
          {
            fromBlock: "0x0",
            toBlock: "latest",
            toAddress: userAddress,
            withMetadata: false,
            excludeZeroValue: true,
            maxCount: "0x3e8",
            category: ["external"],
          },
        ],
      });

      const response = await fetch(alchemyUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body,
      });

      if (!response.ok) throw new Error("Failed to fetch transfers");

      const data = await response.json();
      console.log("Asset Transfers:", data);
      setTransfers(data?.result?.transfers || []);
    } catch (err) {
      console.error("Alchemy fetch error:", err);
    }
  };

  const checkCooldown = async () => {
    try {
      const contract = new Contract(contractAddress, abi, provider);
      const lastTime = await contract.lastClaimTime(address);
      const now = Math.floor(Date.now() / 1000);
      const timeSinceLast = now - lastTime.toNumber();
      setCanClaim(timeSinceLast >= 43200);
    } catch (err) {
      console.warn("Could not check cooldown:", err);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await fetchTransfers(address);
        await checkCooldown();
      } catch (error) {
        console.error("Initialization error:", error);
      }
    };
    if (provider && address) initialize();
  }, [provider, address]);

  const handleClaim = async () => {
    try {
      setLoading(true);
      setMessage("");

      const signer = provider.getSigner();
      const contract = new Contract(contractAddress, abi, signer);

      const tx = await contract.claim();
      await tx.wait();

      setMessage("Claim successful!");
      setCanClaim(false);
    } catch (err) {
      console.error(err);
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleClaim} disabled={!canClaim || loading}>
        {loading ? "Claiming..." : canClaim ? "Claim Tokens" : "Wait 12h"}
      </button>
      {message && <p>{message}</p>}

      {transfers.length > 0 && (
        <div>
          <h4>Recent Transfers:</h4>
          <ul>
            {transfers.slice(0, 5).map((t, idx) => (
              <li key={idx}>
                From: {t.from} | Value: {t.value} | Hash: {t.hash.slice(0, 10)}...
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { Contract, ethers } from "ethers";
import { useWallet } from "@worldcoin/idkit"; // Or replace with your minikit wallet hook
import abi from "./abi.json";

const PMH_CONTRACT = "0x1CA466c720021ACf885370458092BdD8De48FE01";
const ALCHEMY_URL = "https://worldchain-mainnet.g.alchemy.com/v2/weYyU4qQIupaBqhOYgzik9B2C8Ci0NmG_
