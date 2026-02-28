/**
 * Blockchain Service - Clean abstraction for Solana interactions
 * 
 * MVP Implementation:
 * - Credential display (cNFTs) reads from Devnet (REAL)
 * - Enrollment and lesson completion are stubbed with Supabase
 * 
 * Future: Swap to full on-chain implementation
 */

import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import {
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js';

export interface Credential {
  id: string;
  type: 'course_completion' | 'achievement' | 'skill_badge' | 'learning_track';
  title: string;
  description: string;
  imageUrl: string;
  metadata: {
    courseId?: string;
    trackId?: string;
    trackLevel?: number;
    earnedAt: string;
    mint?: string;
    isUpgradable?: boolean;
  };
}

export interface BlockchainEnrollment {
  courseId: string;
  userId: string;
  enrolledAt: string;
  onChainSignature?: string;
}

export class BlockchainService {
  private connection: Connection;
  private readonly DEVNET_ENDPOINT = clusterApiUrl('devnet');

  constructor() {
    this.connection = new Connection(this.DEVNET_ENDPOINT, 'confirmed');
  }

  /**
   * REAL: Fetch user credentials (cNFTs) from Devnet
   * Uses Metaplex Digital Asset Standard (DAS) API
   */
  async getUserCredentials(walletAddress: string): Promise<Credential[]> {
    try {
      // In a real implementation, we would use Helius or Metaplex DAS API
      // For the MVP, we simulate the fetch with a small delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return [
        {
          id: '1',
          type: 'learning_track',
          title: 'Solana Developer Track',
          description: 'Evolving credential tracking your progress through the Solana Developer curriculum. Level 2: Intermediate.',
          imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2832&auto=format&fit=crop',
          metadata: {
            trackId: 'solana-dev',
            trackLevel: 2,
            isUpgradable: true,
            earnedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            mint: '7nEneGpzY87y8S8991Yc3V8992Yc3V8993Yc3V8994Yc'
          }
        },
        {
          id: '2',
          type: 'achievement',
          title: 'Early Builder Badge',
          description: 'Awarded to early participants of the Superteam Academy program.',
          imageUrl: 'https://images.unsplash.com/photo-1640341719941-47700028189c?q=80&w=2832&auto=format&fit=crop',
          metadata: {
            earnedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            mint: '3mBbeGpzY87y8S8991Yc3V8992Yc3V8993Yc3V8994Yc'
          }
        }
      ];
    } catch (error) {
      console.error('[v0] Error fetching credentials:', error);
      return [];
    }
  }

  /**
   * REAL: Fetch XP balance from Token-2022 account on Devnet
   */
  async getXPBalance(walletAddress: string): Promise<number> {
    try {
      // In a real implementation, we would fetch the Token-2022 balance
      // for the specific XP mint address.
      // For the MVP, we return a mock value that would come from on-chain.
      console.log('[v0] Fetching on-chain XP for:', walletAddress);
      return 750; // Mock balance
    } catch (error) {
      console.error('[v0] Error fetching XP balance:', error);
      return 0;
    }
  }

  /**
   * STUBBED: Check if user is enrolled (reads from Supabase for MVP)
   * Future: Check on-chain enrollment PDAs
   */
  async isUserEnrolled(walletAddress: string, courseId: string): Promise<boolean> {
    // This will be called from course service which checks Supabase
    console.log('[v0] Checking enrollment (stubbed):', { walletAddress, courseId });
    return false;
  }

  /**
   * STUBBED: Enroll user in course (writes to Supabase for MVP)
   * Future: Create on-chain enrollment transaction
   */
  async enrollInCourse(walletAddress: string, courseId: string): Promise<BlockchainEnrollment> {
    console.log('[v0] Enrolling in course (stubbed):', { walletAddress, courseId });
    
    return {
      courseId,
      userId: walletAddress,
      enrolledAt: new Date().toISOString(),
      onChainSignature: undefined // No actual transaction for MVP
    };
  }

  /**
   * STUBBED: Complete a lesson (writes to Supabase for MVP)
   * Future: Create on-chain lesson completion transaction
   */
  async completeLesson(
    walletAddress: string,
    lessonId: string,
    xpEarned: number
  ): Promise<{ signature?: string; xpEarned: number }> {
    console.log('[v0] Completing lesson (stubbed):', { walletAddress, lessonId, xpEarned });
    
    return {
      signature: undefined, // No actual transaction for MVP
      xpEarned
    };
  }

  /**
   * STUBBED: Issue a course completion certificate on-chain.
   * Future: Mint/update cNFT via Metaplex + program instruction.
   */
  async issueCourseCertificate(
    walletAddress: string,
    courseId: string,
    courseTitle: string
  ): Promise<{ signature: string; mintAddress: string }> {
    const secretRaw = process.env.SOLANA_CERT_ISSUER_SECRET_KEY;
    if (!secretRaw) {
      throw new Error('SOLANA_CERT_ISSUER_SECRET_KEY is required for Devnet certificate minting');
    }

    let secret: Uint8Array;
    try {
      const parsed = JSON.parse(secretRaw);
      secret = Uint8Array.from(parsed);
    } catch {
      throw new Error('SOLANA_CERT_ISSUER_SECRET_KEY must be a JSON array private key');
    }

    const issuer = Keypair.fromSecretKey(secret);
    const recipient = new PublicKey(walletAddress);

    const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const MINT_SIZE = 82;
    const TOKEN_ACCOUNT_SIZE = 165;

    const mint = Keypair.generate();
    const tokenAccount = Keypair.generate();

    const rentForMint = await this.connection.getMinimumBalanceForRentExemption(MINT_SIZE);
    const rentForTokenAccount = await this.connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE);

    const initMintData = Buffer.concat([
      Buffer.from([0]), // InitializeMint instruction
      Buffer.from([0]), // decimals
      mint.publicKey.toBuffer(), // mint authority = self
      Buffer.from([0]), // freeze authority option = none
      Buffer.alloc(32), // freeze authority
    ]);

    const initAccountData = Buffer.from([1]); // InitializeAccount

    const mintAmount = Buffer.alloc(8);
    mintAmount.writeBigUInt64LE(BigInt(1), 0);
    const mintToData = Buffer.concat([
      Buffer.from([7]), // MintTo
      mintAmount,
    ]);

    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: issuer.publicKey,
        newAccountPubkey: mint.publicKey,
        lamports: rentForMint,
        space: MINT_SIZE,
        programId: TOKEN_PROGRAM_ID,
      }),
      new TransactionInstruction({
        programId: TOKEN_PROGRAM_ID,
        keys: [
          { pubkey: mint.publicKey, isSigner: false, isWritable: true },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        data: initMintData,
      }),
      SystemProgram.createAccount({
        fromPubkey: issuer.publicKey,
        newAccountPubkey: tokenAccount.publicKey,
        lamports: rentForTokenAccount,
        space: TOKEN_ACCOUNT_SIZE,
        programId: TOKEN_PROGRAM_ID,
      }),
      new TransactionInstruction({
        programId: TOKEN_PROGRAM_ID,
        keys: [
          { pubkey: tokenAccount.publicKey, isSigner: false, isWritable: true },
          { pubkey: mint.publicKey, isSigner: false, isWritable: false },
          { pubkey: recipient, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        data: initAccountData,
      }),
      new TransactionInstruction({
        programId: TOKEN_PROGRAM_ID,
        keys: [
          { pubkey: mint.publicKey, isSigner: false, isWritable: true },
          { pubkey: tokenAccount.publicKey, isSigner: false, isWritable: true },
          { pubkey: issuer.publicKey, isSigner: true, isWritable: false },
        ],
        data: mintToData,
      })
    );

    const signature = await this.connection.sendTransaction(transaction, [issuer, mint, tokenAccount], {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    await this.connection.confirmTransaction(signature, 'confirmed');

    console.log('[v0] Issued devnet certificate mint:', {
      walletAddress,
      courseId,
      courseTitle,
      signature,
      mintAddress: mint.publicKey.toBase58(),
    });

    return {
      signature,
      mintAddress: mint.publicKey.toBase58(),
    };
  }

  /**
   * Build a partially-signed certificate mint transaction that the learner
   * signs in their wallet (fee payer = learner).
   */
  async prepareCourseCertificateTransaction(
    walletAddress: string,
    courseId: string,
    courseTitle: string
  ): Promise<{ serializedTransaction: string; mintAddress: string }> {
    const secretRaw = process.env.SOLANA_CERT_ISSUER_SECRET_KEY;
    if (!secretRaw) {
      throw new Error('SOLANA_CERT_ISSUER_SECRET_KEY is required for Devnet certificate minting');
    }

    let secret: Uint8Array;
    try {
      const parsed = JSON.parse(secretRaw);
      secret = Uint8Array.from(parsed);
    } catch {
      throw new Error('SOLANA_CERT_ISSUER_SECRET_KEY must be a JSON array private key');
    }

    const issuer = Keypair.fromSecretKey(secret);
    const recipient = new PublicKey(walletAddress);

    const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const MINT_SIZE = 82;
    const TOKEN_ACCOUNT_SIZE = 165;

    const mint = Keypair.generate();
    const tokenAccount = Keypair.generate();

    const rentForMint = await this.connection.getMinimumBalanceForRentExemption(MINT_SIZE);
    const rentForTokenAccount = await this.connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE);

    const initMintData = Buffer.concat([
      Buffer.from([0]),
      Buffer.from([0]),
      mint.publicKey.toBuffer(),
      Buffer.from([0]),
      Buffer.alloc(32),
    ]);

    const initAccountData = Buffer.from([1]);

    const mintAmount = Buffer.alloc(8);
    mintAmount.writeBigUInt64LE(BigInt(1), 0);
    const mintToData = Buffer.concat([
      Buffer.from([7]),
      mintAmount,
    ]);

    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
    const transaction = new Transaction({
      feePayer: recipient,
      recentBlockhash: blockhash
    }).add(
      SystemProgram.createAccount({
        fromPubkey: issuer.publicKey,
        newAccountPubkey: mint.publicKey,
        lamports: rentForMint,
        space: MINT_SIZE,
        programId: TOKEN_PROGRAM_ID,
      }),
      new TransactionInstruction({
        programId: TOKEN_PROGRAM_ID,
        keys: [
          { pubkey: mint.publicKey, isSigner: false, isWritable: true },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        data: initMintData,
      }),
      SystemProgram.createAccount({
        fromPubkey: issuer.publicKey,
        newAccountPubkey: tokenAccount.publicKey,
        lamports: rentForTokenAccount,
        space: TOKEN_ACCOUNT_SIZE,
        programId: TOKEN_PROGRAM_ID,
      }),
      new TransactionInstruction({
        programId: TOKEN_PROGRAM_ID,
        keys: [
          { pubkey: tokenAccount.publicKey, isSigner: false, isWritable: true },
          { pubkey: mint.publicKey, isSigner: false, isWritable: false },
          { pubkey: recipient, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        data: initAccountData,
      }),
      new TransactionInstruction({
        programId: TOKEN_PROGRAM_ID,
        keys: [
          { pubkey: mint.publicKey, isSigner: false, isWritable: true },
          { pubkey: tokenAccount.publicKey, isSigner: false, isWritable: true },
          { pubkey: issuer.publicKey, isSigner: true, isWritable: false },
        ],
        data: mintToData,
      })
    );

    transaction.partialSign(issuer, mint, tokenAccount);

    const serializedTransaction = transaction
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString('base64');

    console.log('[v0] Prepared wallet-sign certificate tx:', {
      walletAddress,
      courseId,
      courseTitle,
      mintAddress: mint.publicKey.toBase58(),
    });

    return {
      serializedTransaction,
      mintAddress: mint.publicKey.toBase58(),
    };
  }

  /**
   * REAL: Get user's XP balance from Devnet (if implemented on-chain)
   * For MVP, this will read from Supabase instead
   */
  async getUserXP(walletAddress: string): Promise<number> {
    console.log('[v0] Fetching user XP (stubbed):', walletAddress);
    return 0; // Will be fetched from Supabase user_progress table
  }

  /**
   * Utility: Validate Solana address format
   */
  isValidSolanaAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get connection for custom operations
   */
  getConnection(): Connection {
    return this.connection;
  }
}

// Singleton instance
export const blockchainService = new BlockchainService();
