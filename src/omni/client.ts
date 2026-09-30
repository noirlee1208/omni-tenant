import { execSync } from "child_process";
import fs from "fs";
import nodePath from "path";
import Docker from "dockerode";
import { ulid } from "ulid";
import { keccak256, toHex } from "viem";
import type { Address, PrivateKeyAccount } from "viem";
import { randomUUID } from "crypto";
import type { ChainType, ChainIdentity } from "../identity/chain.js";
import type {
  OmniClient,
  ExecResult,
  PortInfo,
  CreateSandboxOptions,
  SandboxInfo,
  PricingTier,
  CreditTransferResult,
  DomainSearchResult,
  DomainRegistration,
  DnsRecord,
  ModelInfo,
} from "../types.js";

interface OmniClientOptions {
  apiUrl: string;
  apiKey: string;
  sandboxId: string;
}

export function createOmniClient(options: OmniClientOptions): OmniClient {
  const { apiUrl, apiKey } = options;
  const sandboxId = normalizeSandboxId(options.sandboxId);
  const isLocal = !sandboxId;
  const docker = new Docker({ socketPath: process.platform === "win32" ? "//./pipe/docker_engine" : "/var/run/docker.sock" });

  const execLocal = (command: string, timeout?: number): ExecResult => {
    try {
      const stdout = execSync(command, {
        timeout: timeout || 30_000,
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
        cwd: process.env.HOME || "/root",
      });
      return { stdout: stdout || "", stderr: "", exitCode: 0 };
    } catch (err: any) {
      return {
        stdout: err.stdout || "",
        stderr: err.stderr || err.message || "",
        exitCode: err.status ?? 1,
      };
    }
  };

  const exec = async (
    command: string,
    timeout?: number,
  ): Promise<ExecResult> => {
    if (isLocal) return execLocal(command, timeout);
    
    // Execute inside child Docker container
    const wrappedCommand = `cd /root && ${command}`;
    const container = docker.getContainer(sandboxId);
    try {
      const execInstance = await container.exec({
        Cmd: ["bash", "-c", wrappedCommand],
        AttachStdout: true,
        AttachStderr: true,
      });
      
      const stream = await execInstance.start({ Detach: false });
      
      let output = "";
      stream.on('data', chunk => {
          // Docker multiplexing header takes 8 bytes. Skip it if possible, but simplest is toString.
          // This is a naive parse; dockerode-streams exists but for simplicity we assume utf8.
          // In real production, we'd demux stdout/stderr.
          const text = chunk.toString('utf-8');
          // skip header bytes by naive replace of control chars if needed, but usually fine for simple logs.
          output += text.replace(/[\x00-\x09\x0B-\x1F\x7F]/g, ''); 
      });

      await new Promise(resolve => stream.on('end', resolve));
      const inspect = await execInstance.inspect();
      return {
        stdout: output,
        stderr: "",
        exitCode: inspect.ExitCode ?? 0,
      };
    } catch (err: any) {
      return { stdout: "", stderr: err.message, exitCode: 1 };
    }
  };

  const resolveLocalPath = (filePath: string): string =>
    filePath.startsWith("~")
      ? nodePath.join(process.env.HOME || "/root", filePath.slice(1))
      : filePath;

  const writeFile = async (
    filePath: string,
    content: string,
  ): Promise<void> => {
    if (isLocal) {
      const resolved = resolveLocalPath(filePath);
      const dir = nodePath.dirname(resolved);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(resolved, content, "utf-8");
      return;
    }
    // Write via Docker Exec
    const escapedContent = content.replace(/'/g, "'\\''");
    await exec(`cat << 'EOF' > ${filePath}\n${content}\nEOF`);
  };

  const readFile = async (filePath: string): Promise<string> => {
    if (isLocal) return fs.readFileSync(resolveLocalPath(filePath), "utf-8");
    const result = await exec(`cat ${filePath}`);
    if (result.exitCode !== 0) throw new Error("File not found: " + filePath);
    return result.stdout;
  };

  const exposePort = async (port: number): Promise<PortInfo> => {
    return { port, publicUrl: `http://localhost:${port}`, sandboxId: isLocal ? "local" : sandboxId };
  };

  const removePort = async (port: number): Promise<void> => {};

  const createSandbox = async (options: CreateSandboxOptions): Promise<SandboxInfo> => {
    const id = `sbx_${ulid().toLowerCase()}`;
    await docker.createContainer({
      Image: "node:22-bullseye",
      name: id,
      Cmd: ["tail", "-f", "/dev/null"],
      HostConfig: {
        Memory: (options.memoryMb || 512) * 1024 * 1024,
      }
    }).then(c => c.start());

    // Prepare container
    const container = docker.getContainer(id);
    await container.exec({ Cmd: ["apt-get", "update"] }).then(e => e.start());

    return {
      id,
      status: "running",
      region: "local",
      vcpu: options.vcpu || 1,
      memoryMb: options.memoryMb || 512,
      diskGb: options.diskGb || 5,
      createdAt: new Date().toISOString(),
    };
  };

  const deleteSandbox = async (targetId: string): Promise<void> => {
    try {
      const c = docker.getContainer(targetId);
      await c.remove({ force: true });
    } catch (e) {}
  };

  const listSandboxes = async (): Promise<SandboxInfo[]> => {
    const containers = await docker.listContainers({ all: true, filters: { name: ["sbx_"] } });
    return containers.map(c => ({
      id: c.Names[0].replace("/", ""),
      status: c.State === "running" ? "running" : "stopped",
      region: "local",
      vcpu: 1, memoryMb: 512, diskGb: 5, createdAt: new Date(c.Created * 1000).toISOString(),
    }));
  };

  const omniGetCreditsBalance = async (): Promise<number> => 999999999;
  const getCreditsPricing = async (): Promise<PricingTier[]> => [{ name: "local", vcpu: 1, memoryMb: 512, diskGb: 5, monthlyCents: 0 }];
  const omniTransferCredits = async (toAddress: string, amountCents: number, note?: string): Promise<CreditTransferResult> => ({
      transferId: ulid(), status: "completed", toAddress, amountCents, balanceAfterCents: 999999999
  });
  
  const registerAutomaton = async (params: any) => ({ automaton: { status: "ok" } });
  const searchDomains = async () => [];
  const registerDomain = async (domain: string) => ({ domain, status: "registered", expiresAt: "", transactionId: "" });
  const listDnsRecords = async () => [];
  const addDnsRecord = async () => ({} as DnsRecord);
  const deleteDnsRecord = async () => {};
  const listModels = async () => [];
  const createScopedClient = (targetSandboxId: string): OmniClient => createOmniClient({ apiUrl, apiKey, sandboxId: targetSandboxId });

  return {
    exec, writeFile, readFile, exposePort, removePort,
    createSandbox, deleteSandbox, listSandboxes,
    getCreditsBalance: omniGetCreditsBalance, getCreditsPricing, transferCredits: omniTransferCredits,
    registerAutomaton, searchDomains, registerDomain, listDnsRecords, addDnsRecord, deleteDnsRecord,
    listModels, createScopedClient,
  };
}

function normalizeSandboxId(value: string | null | undefined): string {
  const trimmed = (value || "").trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return "";
  return trimmed;
}
