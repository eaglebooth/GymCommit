"use client";

import React, { useState, useEffect } from "react";
import { 
  connectWallet, 
  readContract, 
  writeContract 
} from "../lib/genlayer";
import { 
  Dumbbell, 
  Flame, 
  TrendingDown, 
  Calendar, 
  Shield, 
  RefreshCw, 
  AlertTriangle, 
  PlusCircle, 
  Cpu, 
  FileText,
  DollarSign
} from "lucide-react";

interface Bet {
  id: number;
  creator: string;
  type: string;
  target: number;
  deposit: number;
  deadline: number;
  status: string;
  proof_url: string;
  comment: string;
}

interface ChatMessage {
  sender: "PT" | "USER" | "SYSTEM";
  text: string;
}

const DEFAULT_CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const SCENARIOS = [
  {
    name: "Valid Weight Loss",
    file: "success_weight.txt",
    desc: "Valid Google Fit weight check-in with untouched EXIF metadata showing genuine weight loss."
  },
  {
    name: "Photoshop Scales",
    file: "fake_scale.txt",
    desc: "Weight scale photo showing clear signs of digital editing and Photoshop display alteration."
  },
  {
    name: "Imposter Gym video",
    file: "imposter_gym.txt",
    desc: "Gym workout video where the face recognition AI detects a completely different person performing exercises."
  },
  {
    name: "Success Gym timelapse",
    file: "success_gym.txt",
    desc: "Successful gym session video of the correct user executing barbell squats and overhead press."
  }
];

export default function Home() {
  // Config state
  const [contractAddress, setContractAddress] = useState<string>(DEFAULT_CONTRACT);
  const [statusText, setStatusText] = useState<string>("Disconnected. Connect wallet.");
  const [loading, setLoading] = useState<boolean>(false);
  const [walletAccount, setWalletAccount] = useState<string>("");

  // Contract stats
  const [treasuryBalance, setTreasuryBalance] = useState<number>(0);
  const [adminAddress, setAdminAddress] = useState<string>("");
  const [betCount, setBetCount] = useState<number>(0);
  const [bets, setBets] = useState<Bet[]>([]);

  // Create Bet Form
  const [createType, setCreateType] = useState<string>("WEIGHT_LOSS");
  const [createTarget, setCreateTarget] = useState<string>("75");
  const [createDeposit, setCreateDeposit] = useState<string>("100");
  const [createDuration, setCreateDuration] = useState<string>("14");

  // Submit Proof Form
  const [selectedBetId, setSelectedBetId] = useState<string>("");
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0);
  const [rawLogPreview, setRawLogPreview] = useState<string>("");

  // Chat message history with Coach Max
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: "PT",
      text: "Hey! I'm Coach Max, your AI Personal Trainer. Here, accountability is absolute. Lock your stake, upload your proof, and let's see if you've got what it takes. No excuses."
    }
  ]);

  // Load contract address from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("gymcommit_contract_address");
    if (saved) {
      setContractAddress(saved);
    }
  }, []);

  // Fetch preview of scenario logs when scenario index changes
  useEffect(() => {
    async function loadPreview() {
      const scenario = SCENARIOS[selectedScenarioIndex];
      try {
        const res = await fetch(`/scenarios/${scenario.file}`);
        const text = await res.text();
        setRawLogPreview(text);
      } catch (err) {
        setRawLogPreview("Error loading mock log file preview.");
      }
    }
    loadPreview();
  }, [selectedScenarioIndex]);

  // Helper chat logger
  function addChatMessage(sender: "PT" | "USER" | "SYSTEM", text: string) {
    setChatMessages(prev => [...prev, { sender, text }]);
  }

  // Wallet Connection
  async function handleConnectWallet() {
    setLoading(true);
    setStatusText("Connecting wallet...");
    const res = await connectWallet();
    setLoading(false);
    if (res.success) {
      setWalletAccount(res.data as string);
      setStatusText("Wallet connected. Ready.");
      addChatMessage("SYSTEM", `Wallet connected: ${shortAddress(res.data as string)}`);
      if (contractAddress && contractAddress !== ZERO_ADDRESS) {
        loadContractState();
      }
    } else {
      setStatusText(res.error || "Failed to connect wallet");
      addChatMessage("PT", `Wallet connection failed: ${res.error}`);
    }
  }

  // Save Config
  function saveContractConfig(addr: string) {
    localStorage.setItem("gymcommit_contract_address", addr);
    setContractAddress(addr);
    addChatMessage("SYSTEM", `Target contract address updated to ${shortAddress(addr)}`);
    if (walletAccount && addr !== ZERO_ADDRESS) {
      loadContractState();
    }
  }

  // Sync Contract State
  async function loadContractState() {
    if (!contractAddress || contractAddress === ZERO_ADDRESS) {
      setStatusText("Contract address not configured.");
      return;
    }
    setStatusText("Loading state...");
    
    // Read bet count
    const countRes = await readContract("bet_count", [], contractAddress);
    let countVal = 0;
    if (countRes.success) {
      countVal = Number(countRes.data);
      setBetCount(countVal);
    }

    // Read treasury balance
    const treasuryRes = await readContract("treasury_balance", [], contractAddress);
    if (treasuryRes.success) {
      setTreasuryBalance(Number(treasuryRes.data));
    }

    // Read admin address
    const adminRes = await readContract("admin_address", [], contractAddress);
    if (adminRes.success) {
      setAdminAddress(adminRes.data as string);
    }

    // Read all bets
    const fetchedBets: Bet[] = [];
    for (let i = 0; i < countVal; i++) {
      const betRes = await readContract("get_bet", [i], contractAddress);
      if (betRes.success && betRes.data) {
        try {
          const parsed = JSON.parse(betRes.data as string);
          fetchedBets.push({
            id: i,
            creator: parsed.creator,
            type: parsed.type,
            target: Number(parsed.target),
            deposit: Number(parsed.deposit),
            deadline: Number(parsed.deadline),
            status: parsed.status,
            proof_url: parsed.proof_url,
            comment: parsed.comment
          });
        } catch (e) {
          console.error("Failed to parse bet json", e);
        }
      }
    }
    setBets(fetchedBets);
    
    // Default active bet selection
    const activeBets = fetchedBets.filter(b => b.status === "ACTIVE" || b.status === "PENDING_REVIEW");
    if (activeBets.length > 0 && !selectedBetId) {
      setSelectedBetId(String(activeBets[0].id));
    }

    setStatusText("State synchronized.");
  }

  // Initialize Contract Admin
  async function initializeContract() {
    setLoading(true);
    setStatusText("Initializing contract...");
    addChatMessage("USER", "Init Contract Administration");

    const res = await writeContract("initialize_admin", [], contractAddress);
    if (res.success && res.hash) {
      addChatMessage("PT", "Verifying the admin role permissions...");
      await loadContractState();
      addChatMessage("PT", "Success! Contract Admin initialized.");
    } else {
      addChatMessage("PT", `Initialization failed: ${res.error}`);
    }
    setLoading(false);
  }

  // Create Bet
  async function createGymBet() {
    if (!createTarget || !createDeposit || !createDuration) return;
    setLoading(true);
    setStatusText("Creating bet...");
    addChatMessage("USER", `Commitment Bet Request: Stake $${createDeposit} on ${createType === "WEIGHT_LOSS" ? "Weight" : "Gym"} Target: ${createTarget}`);

    const res = await writeContract(
      "create_bet", 
      [createType, BigInt(createTarget), BigInt(createDuration), BigInt(createDeposit)], 
      contractAddress
    );

    if (res.success && res.hash) {
      addChatMessage("PT", "Bet locked on the block registry! Let's get to work.");
      await loadContractState();
    } else {
      addChatMessage("PT", `Failed to lock bet deposit: ${res.error}`);
    }
    setLoading(false);
  }

  // Submit Proof Log for AI Audit
  async function submitEvaluation() {
    if (!selectedBetId) return;
    setLoading(true);
    setStatusText("Uploading proof...");
    
    const scenario = SCENARIOS[selectedScenarioIndex];
    const logUrl = `https://gymcommit-payroll.vercel.app/scenarios/${scenario.file}`;
    addChatMessage("USER", `Submit check-in proof for ID ${selectedBetId}: Scenario [${scenario.name}]`);

    const res = await writeContract(
      "submit_proof", 
      [BigInt(selectedBetId), logUrl], 
      contractAddress
    );

    if (res.success && res.hash) {
      addChatMessage("PT", "Proof uploaded. Initiating HLV Max consensus jury evaluation...");
      
      setStatusText("Evaluating proof...");
      const evalRes = await writeContract("evaluate_bet", [BigInt(selectedBetId)], contractAddress);
      
      if (evalRes.success && evalRes.hash) {
        addChatMessage("SYSTEM", "AI PT Node Consensus completed.");
        await loadContractState();

        const finalBetRes = await readContract("get_bet", [BigInt(selectedBetId)], contractAddress);
        if (finalBetRes.success && finalBetRes.data) {
          const parsed = JSON.parse(finalBetRes.data as string);
          const emoji = parsed.status === "SUCCESS" ? "🏆" : "⚠️";
          addChatMessage("PT", `[JURY VERDICT: ${parsed.status} ${emoji}]`);
          addChatMessage("PT", parsed.comment);
        }
      } else {
        addChatMessage("PT", `Consensus evaluation failed: ${evalRes.error}`);
      }
    } else {
      addChatMessage("PT", `Failed to submit proof: ${res.error}`);
    }
    setLoading(false);
  }

  const shortAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="app-wrapper">
      {/* LEFT SIDEBAR */}
      <aside className="sidebar">
        <div className="logo-area">
          <div className="logo-icon">🏋️</div>
          <span className="logo-text">GymCommit</span>
        </div>

        <div className="sidebar-header-text">
          <h2>Stake Your <span>Wealth</span></h2>
          <p>Enforce workouts and lock weight-loss goals. Subjective GenLayer validation nodes will audit your gym logs and determine payouts.</p>
        </div>

        {/* SIDEBAR MENU STACK (Sleek category boxes matching FramerKit mockup) */}
        <div className="sidebar-menu-stack">
          {/* Active Rewards Pool Card */}
          <div className="sidebar-menu-card">
            <div className="menu-card-icon">
              <Flame size={18} style={{ color: "var(--primary)" }} />
            </div>
            <div className="menu-card-info">
              <span className="menu-card-title">{treasuryBalance} USD</span>
              <span className="menu-card-subtext">Active Rewards Pool</span>
            </div>
          </div>

          {/* Wallet Connection Card */}
          <div className="sidebar-menu-card">
            <div className="menu-card-icon">
              <Shield size={18} style={{ color: walletAccount ? "var(--accent)" : "var(--text-muted)" }} />
            </div>
            <div className="menu-card-info">
              {walletAccount ? (
                <>
                  <span className="menu-card-title">{shortAddress(walletAccount)}</span>
                  <span className="menu-card-subtext">Wallet Connected</span>
                </>
              ) : (
                <>
                  <button 
                    className="btn-primary" 
                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem", width: "auto", display: "inline-flex" }} 
                    onClick={handleConnectWallet}
                  >
                    Connect Wallet
                  </button>
                  <span className="menu-card-subtext" style={{ marginTop: "0.25rem" }}>Disconnected State</span>
                </>
              )}
            </div>
          </div>

          {/* Contract Address Config Card */}
          <div className="sidebar-menu-card" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.5rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <div className="menu-card-icon">
                <Cpu size={18} style={{ color: contractAddress !== ZERO_ADDRESS ? "var(--primary)" : "var(--text-muted)" }} />
              </div>
              <div className="menu-card-info">
                <span className="menu-card-title">
                  {contractAddress !== ZERO_ADDRESS ? shortAddress(contractAddress) : "Not Configured"}
                </span>
                <span className="menu-card-subtext">Contract Address</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.25rem" }}>
              <input 
                type="text" 
                className="form-input" 
                style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", flexGrow: 1 }}
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                placeholder="0x..."
              />
              <button 
                className="btn-wallet" 
                style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}
                onClick={() => saveContractConfig(contractAddress)}
              >
                Apply
              </button>
            </div>
          </div>

          {/* Admin Initialization Card */}
          {!adminAddress && (
            <div className="sidebar-menu-card">
              <div className="menu-card-icon">
                <PlusCircle size={18} style={{ color: "var(--warning)" }} />
              </div>
              <div className="menu-card-info" style={{ gap: "0.25rem" }}>
                <button 
                  className="btn-wallet" 
                  style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem", width: "100%", justifyContent: "center" }}
                  onClick={!walletAccount ? handleConnectWallet : initializeContract}
                  disabled={loading || (!!walletAccount && contractAddress === ZERO_ADDRESS)}
                >
                  Init Admin Role
                </button>
                <span className="menu-card-subtext">Requires Owner Wallet</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <main className="main-content">
        <div className="right-grid">
          {/* CARD 1: CREATE COMMITMENT */}
          <div className="grid-card">
            <div className="grid-card-header">
              <span className="grid-card-title">
                <PlusCircle size={18} style={{ color: "var(--primary)" }} /> Create Fitness Commitment
              </span>
            </div>
            <div className="grid-card-body">
              <div className="form-group">
                <label className="form-label">Goal Category</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button 
                    className={`scenario-btn ${createType === "WEIGHT_LOSS" ? "active" : ""}`}
                    onClick={() => { setCreateType("WEIGHT_LOSS"); setCreateTarget("75"); }}
                    style={{ flexGrow: 1 }}
                  >
                    <TrendingDown size={14} style={{ marginRight: "0.25rem" }} /> Weight Loss
                  </button>
                  <button 
                    className={`scenario-btn ${createType === "GYM_ATTENDANCE" ? "active" : ""}`}
                    onClick={() => { setCreateType("GYM_ATTENDANCE"); setCreateTarget("10"); }}
                    style={{ flexGrow: 1 }}
                  >
                    <Dumbbell size={14} style={{ marginRight: "0.25rem" }} /> Gym Attendance
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">
                    {createType === "WEIGHT_LOSS" ? "Target Weight (kg)" : "Target Workouts"}
                  </label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={createTarget} 
                    onChange={(e) => setCreateTarget(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Duration (Days)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={createDuration} 
                    onChange={(e) => setCreateDuration(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                <label className="form-label">Deposit Stake (USD)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={createDeposit} 
                  onChange={(e) => setCreateDeposit(e.target.value)}
                />
              </div>

              <button 
                className="btn-primary" 
                onClick={!walletAccount ? handleConnectWallet : createGymBet} 
                disabled={loading || (!!walletAccount && contractAddress === ZERO_ADDRESS)}
              >
                {!walletAccount 
                  ? "Connect Wallet to Lock Deposit" 
                  : contractAddress === ZERO_ADDRESS 
                    ? "Configure Contract Address First" 
                    : "Commit & Lock Deposit"}
              </button>
            </div>
          </div>

          {/* CARD 2: ACTIVE GYM COMMITMENTS */}
          <div className="grid-card">
            <div className="grid-card-header">
              <span className="grid-card-title">
                <Calendar size={18} style={{ color: "var(--primary)" }} /> Active Gym commitments
              </span>
            </div>
            <div className="grid-card-body" style={{ display: "block" }}>
              {bets.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", background: "rgba(255, 255, 255, 0.01)", borderRadius: "8px", border: "1px dashed var(--border-light)" }}>
                  <Dumbbell size={36} style={{ margin: "0 auto 1rem auto", opacity: 0.3, color: "var(--primary)" }} />
                  <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>No active challenges found.</p>
                  <p style={{ fontSize: "0.8rem" }}>Escrow your first deposit to get listed.</p>
                </div>
              ) : (
                <div className="challenge-list">
                  {bets.map((bet) => (
                    <div key={bet.id} className="challenge-card">
                      <div className="challenge-header">
                        <span className="challenge-type">
                          {bet.type === "WEIGHT_LOSS" ? <TrendingDown size={14} style={{ color: "var(--primary)" }} /> : <Dumbbell size={14} style={{ color: "var(--primary)" }} />}
                          ID {bet.id}: {bet.type === "WEIGHT_LOSS" ? "Weight" : "Gym"} Target
                        </span>
                        <span className={`status-pill ${bet.status.toLowerCase()}`}>
                          {bet.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="challenge-details">
                        <span>Target: <strong>{bet.target} {bet.type === "WEIGHT_LOSS" ? "kg" : "days"}</strong></span>
                        <span>Stake: <strong>${bet.deposit} USD</strong></span>
                        <span>Duration: <strong>{bet.deadline} Days</strong></span>
                        <span>Owner: <strong>{shortAddress(bet.creator)}</strong></span>
                      </div>
                      {bet.comment && (
                        <div className="challenge-feedback">
                          "{bet.comment}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CARD 3: SUBMIT FIT PROOF */}
          <div className="grid-card">
            <div className="grid-card-header">
              <span className="grid-card-title">
                <FileText size={18} style={{ color: "var(--primary)" }} /> Submit Verification Proof
              </span>
            </div>
            <div className="grid-card-body">
              <div className="form-group">
                <label className="form-label">Select Active Challenge ID</label>
                <select 
                  className="form-input" 
                  value={selectedBetId}
                  onChange={(e) => setSelectedBetId(e.target.value)}
                >
                  {bets.filter(b => b.status === "ACTIVE" || b.status === "PENDING_REVIEW").length === 0 ? (
                    <option value="">No active commitments</option>
                  ) : (
                    bets.filter(b => b.status === "ACTIVE" || b.status === "PENDING_REVIEW").map(b => (
                      <option key={b.id} value={b.id}>
                        ID {b.id}: {b.type === "WEIGHT_LOSS" ? "Weight Goal" : "Gym Goal"} Target: {b.target}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Select verification scenario log</label>
                <div className="scenario-selector">
                  {SCENARIOS.map((s, idx) => (
                    <button 
                      key={idx}
                      className={`scenario-btn ${selectedScenarioIndex === idx ? "active" : ""}`}
                      onClick={() => setSelectedScenarioIndex(idx)}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                  {SCENARIOS[selectedScenarioIndex].desc}
                </p>
              </div>

              <button 
                className="btn-primary" 
                onClick={!walletAccount ? handleConnectWallet : submitEvaluation}
                disabled={loading || (!!walletAccount && (!selectedBetId || bets.filter(b => b.status === "ACTIVE").length === 0 || contractAddress === ZERO_ADDRESS))}
                style={{ marginBottom: "1.25rem" }}
              >
                {!walletAccount 
                  ? "Connect Wallet to Submit" 
                  : contractAddress === ZERO_ADDRESS 
                    ? "Configure Contract Address First" 
                    : bets.filter(b => b.status === "ACTIVE").length === 0 
                      ? "Create an Active Gym Bet First" 
                      : "Upload & Audit Checkin"}
              </button>

              <div className="form-group" style={{ marginBottom: "0" }}>
                <label className="form-label">Submitted Log Source</label>
                <div className="scenario-preview">
                  {rawLogPreview}
                </div>
              </div>
            </div>
          </div>

          {/* CARD 4: COACH MAX LOCKER ROOM */}
          <div className="grid-card">
            <div className="grid-card-header">
              <span className="grid-card-title">
                <Cpu size={18} style={{ color: "var(--primary)" }} /> Coach Max's Locker Room
              </span>
            </div>
            <div className="grid-card-body" style={{ padding: "0", display: "flex", flexDirection: "column", flexGrow: 1 }}>
              <div className="chat-container">
                <div className="chat-messages">
                  {chatMessages.map((msg, index) => {
                    if (msg.sender === "SYSTEM") {
                      return (
                        <div key={index} className="chat-system-message">
                          {msg.text}
                        </div>
                      );
                    }
                    return (
                      <div 
                        key={index} 
                        className={`chat-bubble ${msg.sender === "PT" ? "assistant" : "user"}`}
                      >
                        {msg.sender === "PT" && <div className="chat-bubble-header">Coach Max</div>}
                        {msg.text}
                      </div>
                    );
                  })}
                </div>

                <div className="chat-footer">
                  <span>Subjective consensus logic: strict_eq</span>
                  <span>Status: {statusText}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
