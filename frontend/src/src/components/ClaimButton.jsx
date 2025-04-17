import { useState, useEffect } from "react";
import { Contract, ethers } from "ethers";
import { useWallet } from "@worldcoin/idkit"; // Or replace with your minikit wallet hook
import abi from "./abi.json";

const PMH_CONTRACT = "0x1CA466c720021ACf885370458092BdD8De48FE01";
const ALCHEMY_URL = "https://worldchain-mainnet.g.alchemy.com/v2/weYyU4qQIupaBqhOYgzik9B2C8Ci0NmG";
const CLAIM_COOLDOWN_SECONDS = 43200; // 12 hours

export default function ClaimButton() {
  const { provider, address } = useWallet();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [canClaim, setCanClaim] = useState(false);
  const [nextClaimIn, setNextClaimIn] = useState(0);
  const [balance, setBalance] = useState("0");
  const [transfers, setTransfers] = useState([]);

  const fetchTransfers = async () => {
    try {
      const body = JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "alchemy_getAssetTransfers",
        params: [
          {
            fromBlock: "0x0",
            toBlock: "latest",
            toAddress: address,
            withMetadata: false,
            excludeZeroValue: true,
            maxCount: "0x3e8",
            category: ["erc20"]
          }
        ]
      });

      const response = await fetch(ALCHEMY_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body
      });

      const data = await response.json();
      const filtered = (data?.result?.transfers || []).filter(
        (tx) => tx.rawContract?.address?.toLowerCase() === PMH_CONTRACT.toLowerCase()
      );

      setTransfers(filtered);
    } catch (err) {
      console.error("Alchemy fetch error:", err);
    }
  };

  const fetchPMHBalance = async () => {
    try {
      const contract = new Contract(PMH_CONTRACT, abi, provider);
      const raw = await contract.balanceOf(address);
      const formatted = ethers.utils.formatUnits(raw, 18);
      setBalance(formatted);
    } catch (err) {
      console.error("Failed to fetch PMH balance:", err);
    }
  };

  const checkCooldown = async () => {
    try {
      const contract = new Contract(PMH_CONTRACT, abi, provider);
      const lastTime = await contract.lastClaimTime(address);
      const now = Math.floor(Date.now() / 1000);
      const nextTime = lastTime.toNumber() + CLAIM_COOLDOWN_SECONDS;

      const remaining = nextTime - now;
      if (remaining <= 0) {
        setCanClaim(true);
        setNextClaimIn(0);
      } else {
        setCanClaim(false);
        setNextClaimIn(remaining);
      }
    } catch (err) {
      console.warn("Could not check cooldown:", err);
    }
  };

  const handleClaim = async () => {
    try {
      setLoading(true);
      setMessage("");
      const signer = provider.getSigner();
      const contract = new Contract(PMH_CONTRACT, abi, signer);

      const tx = await contract.claim();
      await tx.wait();

      setMessage("✅ Claim successful!");
      await fetchPMHBalance();
      await fetchTransfers();
      setCanClaim(false);
      setNextClaimIn(CLAIM_COOLDOWN_SECONDS);
    } catch (err) {
      console.error(err);
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (provider && address) {
      fetchTransfers();
      fetchPMHBalance();
      checkCooldown();
    }
  }, [provider, address]);

  // Countdown interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (nextClaimIn > 0) {
        setNextClaimIn((prev) => prev - 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [nextClaimIn]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "1rem", maxWidth: "400px" }}>
      <h3>PMH Token Dashboard</h3>

      <p><strong>Balance:</strong> {balance} PMH</p>

      <button onClick={handleClaim} disabled={!canClaim || loading} style={{
        padding: "10px 20px",
        fontSize: "16px",
        backgroundColor: canClaim ? "#4caf50" : "#999",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: canClaim ? "pointer" : "not-allowed",
        transition: "0.3s"
      }}>
        {loading ? "Claiming..." : canClaim ? "Claim PMH" : `Wait ${formatTime(nextClaimIn)}`}
      </button>

      {message && <p style={{ marginTop: "1rem", color: message.startsWith("✅") ? "green" : "red" }}>{message}</p>}

      {transfers.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <h4>Recent PMH Transfers</h4>
          <ul>
            {transfers.slice(0, 5).map((t, idx) => (
              <li key={idx}>
                From: {t.from.slice(0, 6)}... | Value: {t.value} | Tx: {t.hash.slice(0, 10)}...
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
