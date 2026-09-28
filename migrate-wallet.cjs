const fs = require('fs');
const path = require('path');
const os = require('os');

const oldJsonPath = path.join(os.homedir(), 'agent-workspace/crypto-tenant-agent/data/agent_state.json');
const newWalletPath = path.join(os.homedir(), '.automaton/wallet.json');

try {
    if (fs.existsSync(oldJsonPath)) {
        const oldState = JSON.parse(fs.readFileSync(oldJsonPath, 'utf8'));
        if (oldState.wallet && oldState.wallet.publicKey) {
            const newWallet = {
                chainType: 'solana',
                address: oldState.wallet.publicKey,
                secretKey: oldState.wallet.privateKey
            };
            
            const dir = path.dirname(newWalletPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
            
            fs.writeFileSync(newWalletPath, JSON.stringify(newWallet, null, 2));
            console.log(`✅ [DATA MIGRATION] Đã chuyển giao thành công Ví Solana gốc: ${newWallet.address}`);
        }
    }
} catch (e) {
    console.error('Lỗi chuyển giao ví:', e.message);
}
