"use client";
import { useState } from "react";
import { Send, Clock } from "lucide-react";

export default function InteractivePanel({ mempool = [], onInjectTx }) {
  const [sender, setSender] = useState("Alice");
  const [receiver, setReceiver] = useState("Bob");
  const [amount, setAmount] = useState(50);

  const handleInject = () => {
    if (!sender || !receiver || !amount) return;
    onInjectTx(sender, receiver, Number(amount));
  };

  return (
    <div className="space-y-4">
      {/* Transaction Injector */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-lg">
        <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide flex items-center">
          <Send size={14} className="mr-2 text-blue-400" /> 
          Inject Transaction
        </h3>
        <div className="space-y-3">
          <div className="flex space-x-2">
            <input 
              placeholder="Sender" 
              value={sender} 
              onChange={e => setSender(e.target.value)}
              className="w-1/2 bg-gray-950 border border-gray-800 rounded p-2 text-xs focus:outline-none focus:border-blue-500 text-gray-200"
            />
            <input 
              placeholder="Receiver" 
              value={receiver} 
              onChange={e => setReceiver(e.target.value)}
              className="w-1/2 bg-gray-950 border border-gray-800 rounded p-2 text-xs focus:outline-none focus:border-blue-500 text-gray-200"
            />
          </div>
          <div className="flex space-x-2">
            <input 
              type="number" 
              placeholder="Amount" 
              value={amount} 
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs focus:outline-none focus:border-blue-500 text-gray-200"
            />
            <button 
              onClick={handleInject}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs font-medium transition-colors whitespace-nowrap"
            >
              Sign & Broadcast
            </button>
          </div>
        </div>
      </div>

      {/* Global Mempool */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-lg flex flex-col min-h-[200px] max-h-[300px]">
        <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide flex justify-between items-center shrink-0">
          <span className="flex items-center">
            <Clock size={14} className="mr-2 text-amber-400" />
            Global Mempool
          </span>
          <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full text-[10px]">
            {mempool.length} Pending
          </span>
        </h3>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
          {mempool.length === 0 ? (
            <div className="text-gray-500 text-xs italic text-center py-4 border border-dashed border-gray-800 rounded-lg">
              Mempool is empty
            </div>
          ) : (
            mempool.map(tx => (
              <div key={tx.id} className="bg-gray-950 p-2.5 rounded border border-gray-800 hover:border-gray-700 transition-colors">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-mono text-[10px] text-gray-500" title={tx.id}>
                    {tx.id.substring(0, 10)}...
                  </span>
                  <span className="text-emerald-400 font-mono text-[10px] font-bold">
                    {tx.amount} KRYPT
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-blue-400 font-mono truncate max-w-[40%]">{tx.sender}</span>
                  <span className="text-gray-600">→</span>
                  <span className="text-purple-400 font-mono truncate max-w-[40%] text-right">{tx.receiver}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
