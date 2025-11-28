import { Component, signal, ChangeDetectorRef, NgZone } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import { DashboardV2Component } from './dashboard-v2.component';
import { HelpComponent } from './help.component';
import { ChangeTrackComponent } from './change-track.component';






interface Contract {
  monthYear: string;
  name: string;
  type: 'regular' | 'nifty';
  pnl: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardV2Component, HelpComponent, ChangeTrackComponent],
  template: `
    <div class="container">
      <div class="nav-tabs">
        <button 
          class="tab-btn" 
          [class.active]="activeTab === 'input'"
          (click)="switchTab('input')">
          📝 Input Data
        </button>
        <button 
          class="tab-btn" 
          [class.active]="activeTab === 'dashboard'"
          (click)="switchTab('dashboard')">
          📊 Dashboard
        </button>
        <button 
          class="tab-btn" 
          [class.active]="activeTab === 'v2'"
          (click)="switchTab('v2')">
          🚀 V2 Dashboard
        </button>
        <button 
          class="tab-btn" 
          [class.active]="activeTab === 'change-track'"
          (click)="switchTab('change-track')">
          🔄 Change Track
        </button>
        <button 
          class="tab-btn" 
          [class.active]="activeTab === 'help'"
          (click)="switchTab('help')">
          ❓ Help
        </button>
      </div>

      <!-- Input Tab -->
      <div *ngIf="activeTab === 'input'" class="tab-content">
        <div class="input-section">
          <h2 style="margin-bottom: 25px; color: #ffc107;">Enter Trading Contract Data</h2>
          
          <!-- Excel Upload Section -->
          <div class="upload-section">
            <label class="upload-label">
              📊 Upload Excel File
              <span style="font-size: 0.85em; color: #888; margin-left: 10px;">
                (Columns: Symbol, Realized P&L)
              </span>
            </label>
            <div class="upload-area">
              <input 
                type="file" 
                id="fileUpload"
                accept=".xlsx,.xls"
                (change)="onFileChange($event)"
                style="display: none">
              <label for="fileUpload" class="upload-btn">
                📁 Choose Excel File
              </label>
              <span *ngIf="uploadedFileName" class="file-name">{{ uploadedFileName }}</span>
            </div>
            <div class="upload-info">
              <strong>Excel Format:</strong> Column A: Symbol, Column B: Realized P&L (Type auto-detected from symbol name)

            </div>
            <!-- Upload feedback UI -->
            <div class="upload-feedback" *ngIf="uploadInProgress || uploadStatusMessage">
              <div *ngIf="uploadInProgress" class="progress-wrapper">
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="uploadProgress"></div>
                </div>
                <div class="progress-text">{{ uploadProgress }}% {{ uploadPhase }}</div>
              </div>
              <div *ngIf="!uploadInProgress && uploadStatusMessage" class="status-message" [class.success]="uploadSuccess" [class.error]="uploadError">
                <span>{{ uploadStatusMessage }}</span>
                <button class="close-status" (click)="clearUploadStatus()">✖</button>
              </div>
            </div>
          </div>

          <div class="divider">OR Enter Manually</div>

          <!-- Manual Input Form -->
          <div class="form-group">
            <label>Month & Year</label>
            <input 
              type="month" 
              [(ngModel)]="formData.monthYear"
              class="form-control">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Contract Name</label>
              <input 
                type="text" 
                [(ngModel)]="formData.contractName"
                placeholder="e.g., WIPRO25DECFUT"
                class="form-control">
            </div>
            <div class="form-group">
              <label>Contract Type</label>
              <select [(ngModel)]="formData.contractType" class="form-control">
                <option value="regular">Regular</option>
                <option value="nifty">NIFTY</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Profit/Loss (₹)</label>
            <input 
              type="number" 
              [(ngModel)]="formData.contractPnL"
              placeholder="e.g., 18600 or -5000"
              step="0.01"
              class="form-control">
          </div>

          <div style="margin-top: 25px;">
            <button class="btn" (click)="addContract()">➕ Add Contract</button>
            <button class="btn btn-secondary" (click)="clearAll()">🗑️ Clear All</button>
            <button class="btn btn-secondary" (click)="downloadTemplate()">⬇️ Download Template</button>
          </div>

          <!-- Contracts List -->
          <div class="contracts-list">
            <h3 *ngIf="contracts.length > 0" style="margin: 30px 0 15px 0; color: #ffc107;">
              Added Contracts
            </h3>
            <p *ngIf="contracts.length === 0" style="text-align: center; color: #888; padding: 20px;">
              No contracts added yet
            </p>
            <div 
              *ngFor="let contract of contracts; let i = index; trackBy: trackByIndex"
              class="contract-item"
              [class.profit]="contract.pnl >= 0"
              [class.loss]="contract.pnl < 0">
              <div>
                <strong>{{ contract.name }}</strong>
                <span style="color: #888; margin-left: 15px;">{{ formatMonth(contract.monthYear) }}</span>
                <span 
                  class="badge"
                  [style.background]="contract.type === 'nifty' ? 'rgba(33, 150, 243, 0.3)' : 'rgba(255, 193, 7, 0.3)'">
                  {{ contract.type === 'nifty' ? 'NIFTY' : 'REGULAR' }}
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 20px;">
                <span 
                  style="font-size: 1.2em; font-weight: bold;"
                  [style.color]="contract.pnl >= 0 ? '#4caf50' : '#f44336'">
                  ₹{{ formatNumber(contract.pnl) }}
                </span>
                <button class="delete-btn" (click)="deleteContract(i)">Delete</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dashboard Tab -->
      <div *ngIf="activeTab === 'dashboard'" class="tab-content">
        <div *ngIf="contracts.length === 0" class="empty-state">
          <h3>No Trading Data Available</h3>
          <p>Please add contracts in the Input Data tab to view the dashboard</p>
        </div>

        <div *ngIf="contracts.length > 0" class="dashboard" id="dashboard-content">
          <div class="dashboard-header">
            <h1>{{ getMonthName() }} TRADING PERFORMANCE DASHBOARD</h1>
            <button class="btn export-btn" (click)="exportDashboardAsImage()">📸 Export as Image</button>
          </div>

          <div class="overall-pnl">
            <h2>OVERALL REALIZED P&L</h2>
            <div 
              class="amount"
              [class.profit]="getTotalPnL() >= 0"
              [class.loss]="getTotalPnL() < 0">
              {{ getTotalPnL() >= 0 ? '+' : '-' }}₹{{ formatNumber(Math.abs(getTotalPnL())) }}
            </div>
            <div class="label">{{ getTotalPnL() >= 0 ? 'NET PROFIT' : 'NET LOSS' }}</div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-header">
                <span class="card-icon">🏆</span>
                <span class="card-title">MAJOR PROFIT CONTRIBUTORS</span>
              </div>
              <div *ngIf="getMajorProfits().length === 0" style="color: #888;">No profit contracts</div>
              <div 
                *ngFor="let contract of getMajorProfits()"
                class="contract-list-item">
                <span class="contract-name">{{ contract.name }}</span>
                <span class="contract-value profit">₹{{ formatNumber(contract.pnl) }}</span>
              </div>
              <div class="category-summary">
                Total Profit:
                <span class="summary-profit">₹{{ formatNumber(getRegularProfitTotal()) }}</span>
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <span class="card-icon">⭐</span>
                <span class="card-title">MAJOR LOSS CONTRIBUTORS</span>
              </div>
              <div *ngIf="getMajorLosses().length === 0" style="color: #888;">No loss contracts</div>
              <div 
                *ngFor="let contract of getMajorLosses()"
                class="contract-list-item">
                <span class="contract-name">{{ contract.name }}</span>
                <span class="contract-value loss">₹{{ formatNumber(contract.pnl) }}</span>
              </div>
              <div class="category-summary">
                Total Loss:
                <span class="summary-loss">₹{{ formatNumber(getRegularLossTotal()) }}</span>
              </div>
            </div>

            
          </div>

          <!-- NIFTY Futures Performance (full width) -->
          <div class="card nifty-futures-card">
            <div class="card-header">
              <span class="card-icon">📉</span>
              <span class="card-title">NIFTY FUTURES PERFORMANCE</span>
            </div>
            <div class="nifty-futures-overall">
              <strong>Overall NIFTY Futures P&L:</strong>
              <span 
                [style.color]="getNiftyFuturesTotal() >= 0 ? '#4caf50' : '#f44336'"
                style="font-weight: bold; font-size: 1.2em; margin-left: 10px;">
                {{ getNiftyFuturesTotal() >= 0 ? '+' : '' }}₹{{ formatNumber(Math.abs(getNiftyFuturesTotal())) }}
              </span>
            </div>
            <div class="nifty-futures-grid">
              <div>
                <h4 style="color: #4caf50; margin: 10px 0;">Top 5 Profit Makers</h4>
                <div *ngIf="getNiftyProfits().length === 0" style="color: #888; font-size: 0.9em;">No NIFTY profit contracts</div>
                <div 
                  *ngFor="let contract of getNiftyProfits()"
                  class="contract-list-item">
                  <span class="contract-name">{{ contract.name }}</span>
                  <span class="contract-value profit">₹{{ formatNumber(contract.pnl) }}</span>
                </div>
              </div>
              <div>
                <h4 style="color: #f44336; margin: 10px 0;">Top 5 Lossers</h4>
                <div *ngIf="getNiftyLosses().length === 0" style="color: #888; font-size: 0.9em; min-height: 120px; display: flex; align-items: center;">No NIFTY loss contracts</div>
                <div 
                  *ngFor="let contract of getNiftyLosses()"
                  class="contract-list-item">
                  <span class="contract-name">{{ contract.name }}</span>
                  <span class="contract-value loss">₹{{ formatNumber(contract.pnl) }}</span>
                </div>
              </div>
            </div>
            <div class="category-summary">
              NIFTY FUTURES Profit:
              <span class="summary-profit">₹{{ formatNumber(getNiftyFuturesProfitTotal()) }}</span>
              |
              NIFTY FUTURES Loss:
              <span class="summary-loss">₹{{ formatNumber(getNiftyFuturesLossTotal()) }}</span>
            </div>
          </div>

          <!-- NIFTY Options Performance Card -->
          <div class="card nifty-options-card">
            <div class="card-header">
              <span class="card-icon">📈</span>
              <span class="card-title">NIFTY OPTIONS PERFORMANCE</span>
            </div>
            <div class="nifty-options-overall">
              <strong>Overall NIFTY Options P&L:</strong>
              <span 
                [style.color]="getNiftyOptionsTotal() >= 0 ? '#4caf50' : '#f44336'"
                style="font-weight: bold; font-size: 1.2em; margin-left: 10px;">
                {{ getNiftyOptionsTotal() >= 0 ? '+' : '' }}₹{{ formatNumber(Math.abs(getNiftyOptionsTotal())) }}
              </span>
            </div>
            <div class="nifty-options-grid">
              <div>
                <h4 style="color: #4caf50; margin: 15px 0 10px 0;">Top 5 Profits</h4>
                <div *ngIf="getNiftyOptionTopProfits().length === 0" style="color: #888; font-size: 0.9em;">No profit options</div>
                <div 
                  *ngFor="let contract of getNiftyOptionTopProfits()"
                  class="contract-list-item">
                  <span class="contract-name">{{ contract.name }}</span>
                  <span class="contract-value profit">₹{{ formatNumber(contract.pnl) }}</span>
                </div>
              </div>
              <div>
                <h4 style="color: #f44336; margin: 15px 0 10px 0;">Top 5 Losses</h4>
                <div *ngIf="getNiftyOptionTopLosses().length === 0" style="color: #888; font-size: 0.9em;">No loss options</div>
                <div 
                  *ngFor="let contract of getNiftyOptionTopLosses()"
                  class="contract-list-item">
                  <span class="contract-name">{{ contract.name }}</span>
                  <span class="contract-value loss">₹{{ formatNumber(contract.pnl) }}</span>
                </div>
              </div>
            </div>
            <div class="category-summary">
              NIFTY OPTION Profit:
              <span class="summary-profit">₹{{ formatNumber(getNiftyOptionsProfitTotal()) }}</span>
              |
              NIFTY OPTION Loss:
              <span class="summary-loss">₹{{ formatNumber(getNiftyOptionsLossTotal()) }}</span>
            </div>
          </div>

          <div class="summary-section">
            <h2>📋 {{ getMonthName() }} SUMMARY</h2>
            <div class="summary-stats">
              <div class="summary-stat">
                <div class="stat-label">Total Profit</div>
                <div class="stat-value" style="color: #4caf50;">₹{{ formatNumber(getTotalProfit()) }}</div>
              </div>
              <div class="summary-stat">
                <div class="stat-label">Total Loss</div>
                <div class="stat-value" style="color: #f44336;">₹{{ formatNumber(getTotalLoss()) }}</div>
              </div>
              <div class="summary-stat">
                <div class="stat-label">Net {{ getTotalPnL() >= 0 ? 'Profit' : 'Loss' }}</div>
                <div 
                  class="stat-value"
                  [style.color]="getTotalPnL() >= 0 ? '#4caf50' : '#f44336'">
                  ₹{{ formatNumber(Math.abs(getTotalPnL())) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- V2 Dashboard Tab -->
      <div *ngIf="activeTab === 'v2'" class="tab-content">
        <app-dashboard-v2 [contracts]="contracts"></app-dashboard-v2>
      </div>

      <!-- Change Track Tab -->
      <div *ngIf="activeTab === 'change-track'" class="tab-content">
        <app-change-track></app-change-track>
      </div>

      <!-- Help Tab -->
      <div *ngIf="activeTab === 'help'" class="tab-content">
        <app-help></app-help>
      </div>
    </div>
  `,
  styles: [`
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :host {
      display: block;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #1a2332 0%, #0f1419 100%);
      color: #fff;
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .nav-tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 30px;
    }

    .tab-btn {
      padding: 12px 30px;
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      cursor: pointer;
      border-radius: 8px;
      font-size: 16px;
      transition: all 0.3s;
    }

    .tab-btn.active {
      background: rgba(255, 193, 7, 0.2);
      border-color: #ffc107;
    }

    .input-section {
      background: rgba(255, 255, 255, 0.05);
      padding: 30px;
      border-radius: 15px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .upload-section {
      background: rgba(33, 150, 243, 0.1);
      border: 2px dashed rgba(33, 150, 243, 0.3);
      border-radius: 12px;
      padding: 25px;
      margin-bottom: 30px;
    }

    .upload-label {
      display: block;
      font-size: 1.1em;
      color: #ffc107;
      font-weight: 600;
      margin-bottom: 15px;
    }

    .upload-area {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 15px;
    }

    .upload-btn {
      padding: 12px 25px;
      background: #2196f3;
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s;
      display: inline-block;
    }

    .upload-btn:hover {
      background: #1976d2;
      transform: translateY(-2px);
    }

    .file-name {
      color: #4caf50;
      font-weight: 600;
    }

    .upload-info {
      color: #888;
      font-size: 0.9em;
      padding: 10px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 5px;
    }

    .upload-feedback { margin-top: 15px; display: flex; flex-direction: column; gap: 10px; }
    .progress-wrapper { display: flex; flex-direction: column; gap: 6px; }
    .progress-bar { position: relative; width: 100%; height: 10px; background: rgba(255,255,255,0.15); border-radius: 6px; overflow: hidden; }
    .progress-fill { position: absolute; top:0; left:0; height:100%; background: linear-gradient(90deg,#4caf50,#81c784); transition: width 0.15s ease; }
    .progress-text { font-size: 0.75em; letter-spacing: 1px; color: #ccc; }
    .status-message { display:flex; align-items:center; justify-content: space-between; gap:12px; padding:10px 14px; border-radius:8px; font-size:0.8em; }
    .status-message.success { background: rgba(76,175,80,0.15); border:1px solid rgba(76,175,80,0.4); color:#4caf50; }
    .status-message.error { background: rgba(244,67,54,0.15); border:1px solid rgba(244,67,54,0.4); color:#f44336; }
    .close-status { background: transparent; border:none; color: #aaa; cursor:pointer; font-size: 0.9em; }
    .close-status:hover { color: #fff; }

    .divider {
      text-align: center;
      margin: 30px 0;
      position: relative;
      color: #888;
      font-weight: 600;
    }

    .divider::before,
    .divider::after {
      content: '';
      position: absolute;
      top: 50%;
      width: 40%;
      height: 1px;
      background: rgba(255, 255, 255, 0.2);
    }

    .divider::before {
      left: 0;
    }

    .divider::after {
      right: 0;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      color: #ffc107;
      font-weight: 600;
    }

    .form-control {
      width: 100%;
      padding: 12px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: #fff;
      font-size: 16px;
    }

    .form-control:focus {
      outline: none;
      border-color: #ffc107;
    }

    select.form-control option {
      background: #1a2332;
      color: #fff;
      padding: 12px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
    }

    .btn {
      padding: 12px 30px;
      background: #ffc107;
      border: none;
      border-radius: 8px;
      color: #1a2332;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s;
      margin-right: 10px;
    }

    .btn:hover {
      background: #ffcd38;
      transform: translateY(-2px);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .contracts-list {
      margin-top: 30px;
    }

    .contract-item {
      background: rgba(255, 255, 255, 0.05);
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-left: 4px solid;
    }

    .contract-item.profit {
      border-left-color: #4caf50;
    }

    .contract-item.loss {
      border-left-color: #f44336;
    }

    .badge {
      padding: 4px 12px;
      border-radius: 12px;
      margin-left: 15px;
      font-size: 0.85em;
    }

    .delete-btn {
      background: #f44336;
      padding: 8px 16px;
      border: none;
      border-radius: 5px;
      color: #fff;
      cursor: pointer;
    }

    .dashboard {
      animation: fadeIn 0.5s;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .dashboard-header {
      text-align: center;
      margin-bottom: 30px;
      position: relative;
    }

    .dashboard-header h1 {
      font-size: 2em;
      color: #ffc107;
      margin-bottom: 10px;
      letter-spacing: 2px;
    }

    .export-btn {
      position: absolute;
      top: 0;
      right: 0;
      padding: 10px 20px;
      background: #2196f3;
      color: #fff;
      font-size: 14px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .export-btn:hover {
      background: #1976d2;
      transform: translateY(-2px);
    }

    .overall-pnl {
      background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%);
      border: 2px solid rgba(255, 193, 7, 0.3);
      border-radius: 20px;
      padding: 25px;
      text-align: center;
      margin-bottom: 30px;
    }

    .overall-pnl h2 {
      font-size: 1em;
      color: #ffc107;
      margin-bottom: 15px;
      letter-spacing: 3px;
    }

    .overall-pnl .amount {
      font-size: 2.5em;
      font-weight: bold;
      margin-bottom: 10px;
    }

    .overall-pnl .amount.profit {
      color: #4caf50;
    }

    .overall-pnl .amount.loss {
      color: #f44336;
    }

    .overall-pnl .label {
      font-size: 0.95em;
      color: #aaa;
      letter-spacing: 2px;
    }

      .nifty-futures-overall {
        margin: 8px 0 12px 0;
        font-size: 1.1em;
        padding: 15px;
        background: rgba(255, 193, 7, 0.1);
        border-radius: 10px;
        text-align: center;
      }

      .nifty-futures-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .nifty-futures-card {
        border-left: 4px solid rgba(33, 150, 243, 0.4);
        min-height: 360px;
        grid-column: 1 / -1;
      }

      .nifty-futures-grid > div {
        min-height: 150px;
      }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 25px;
      margin-bottom: 40px;
    }

    .card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 20px;
      padding: 30px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .nifty-options-card {
      grid-column: 1 / -1;
    }

    .nifty-options-overall {
      padding: 15px;
      background: rgba(255, 193, 7, 0.1);
      border-radius: 10px;
      margin-bottom: 15px;
      text-align: center;
      font-size: 1.1em;
    }

    .nifty-options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 2px solid rgba(255, 255, 255, 0.1);
    }

    .card-icon {
      font-size: 2em;
    }

    .card-title {
      font-size: 1.3em;
      font-weight: bold;
    }

    .contract-list-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .contract-list-item:last-child {
      border-bottom: none;
    }

    .contract-name {
      font-size: 0.9em;
      color: #ddd;
    }

    .contract-value {
      font-size: 0.95em;
      font-weight: bold;
    }

    .contract-value.profit {
      color: #4caf50;
    }

    .contract-value.loss {
      color: #f44336;
    }

    .summary-section {
      background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%);
      border: 2px solid rgba(255, 193, 7, 0.3);
      border-radius: 20px;
      padding: 20px;
      text-align: center;
    }

    .summary-section h2 {
      font-size: 1.4em;
      color: #ffc107;
      margin-bottom: 20px;
      letter-spacing: 2px;
    }

    .summary-stats {
      display: flex;
      justify-content: space-around;
      flex-wrap: wrap;
      gap: 20px;
    }

    .summary-stat {
      flex: 1;
      min-width: 200px;
    }

    .summary-stat .stat-label {
      font-size: 0.85em;
      color: #aaa;
      margin-bottom: 8px;
    }

    .summary-stat .stat-value {
      font-size: 1.4em;
      font-weight: bold;
    }

    .category-summary {
      margin-top: 8px;
      color: #bbb;
      font-size: 0.85em;
      text-align: center;
    }

    .summary-profit {
      color: #4caf50;
      font-weight: 700;
    }

    .summary-loss {
      color: #f44336;
      font-weight: 700;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #888;
    }

    .empty-state h3 {
      margin-bottom: 15px;
    }
  `]
})

export class App {
  protected readonly title = signal('trading-dashboard');
  Math = Math;
  activeTab: 'input' | 'dashboard' | 'v2' | 'change-track' | 'help' = 'input';
  contracts: Contract[] = [];
  uploadedFileName: string = '';
  uploadInProgress = false;
  uploadProgress = 0;
  uploadPhase = '';
  uploadStatusMessage = '';
  uploadSuccess = false;
  uploadError = false;

  formData = {
    monthYear: this.getCurrentMonth(),
    contractName: '',
    contractType: 'regular' as 'regular' | 'nifty',
    contractPnL: null as number | null
  };

  constructor(private cdr: ChangeDetectorRef, private zone: NgZone) {}

  getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  switchTab(tab: 'input' | 'dashboard' | 'v2' | 'change-track' | 'help') {
    this.activeTab = tab;
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.uploadedFileName = file.name;
      const reader = new FileReader();
      // Initialize progress state
      this.uploadInProgress = true;
      this.uploadProgress = 0;
      this.uploadPhase = 'Loading file';
      this.uploadStatusMessage = '';
      this.uploadSuccess = false;
      this.uploadError = false;

      reader.onprogress = (e: ProgressEvent<FileReader>) => {
        if (e.lengthComputable) {
          const percent = Math.floor((e.loaded / e.total) * 40); // File load phase up to 40%
          this.zone.run(() => {
            this.uploadProgress = percent;
          });
        }
      };
      
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          // Skip header row and process data
          const newContracts: Contract[] = [];
          let successCount = 0;
          this.uploadPhase = 'Parsing rows';
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row[0] && row[1] !== undefined) {
              const contractName = String(row[0]).trim();
              const pnl = Number(row[1]);
              // Auto-detect type based on symbol name
              const contractType = contractName.toUpperCase().includes('NIFTY') ? 'nifty' : 'regular';

              if (contractName && !isNaN(pnl)) {
                newContracts.push({
                  monthYear: this.formData.monthYear,
                  name: contractName,
                  type: contractType,
                  pnl: pnl
                });
                successCount++;
              }
            }
            // Update parse progress (40% - 95%)
            if (jsonData.length > 1) {
              const progressPortion = ((i) / (jsonData.length - 1));
              const mapped = 40 + Math.floor(progressPortion * 55); // 40 -> 95
              if (mapped > this.uploadProgress) {
                this.zone.run(() => { this.uploadProgress = mapped; });
              }
            }
          }

          // Ensure UI updates within Angular zone for immediate refresh
          this.zone.run(() => {
            this.contracts = [...this.contracts, ...newContracts];
            this.uploadedFileName = file.name;
            this.uploadPhase = 'Finalizing';
            // Ensure UI reaches 100% and triggers change detection
            this.uploadProgress = Math.max(this.uploadProgress, 95);
            requestAnimationFrame(() => {
              this.uploadProgress = 100;
              this.uploadInProgress = false;
              this.uploadSuccess = true;
              this.uploadStatusMessage = successCount === 0
                ? 'No valid rows found.'
                : `Imported ${successCount} contract${successCount !== 1 ? 's' : ''} successfully.`;
              this.cdr.detectChanges();
            });
            this.cdr.detectChanges();
            // Reset file input to allow re-upload of same file
            event.target.value = '';
          });
        } catch (error) {
          this.zone.run(() => {
            this.uploadInProgress = false;
            this.uploadError = true;
            this.uploadStatusMessage = 'Error reading Excel file. Please check the format.';
          });
          console.error(error);
        }
      };

      reader.readAsArrayBuffer(file);
    }
  }

  clearUploadStatus() {
    this.uploadStatusMessage = '';
    this.uploadSuccess = false;
    this.uploadError = false;
  }

  downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Symbol', 'Realized P&L'],
      ['WIPRO25DECFUT', 18600],
      ['NIFTY25N112450PE', -7946.25],
      ['KAYNES25DECFUT', 7500]
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contracts');
    XLSX.writeFile(wb, 'trading_contracts_template.xlsx');
  }

  addContract() {
    if (!this.formData.monthYear || !this.formData.contractName || 
        this.formData.contractPnL === null || isNaN(this.formData.contractPnL)) {
      alert('Please fill all fields correctly');
      return;
    }

    this.contracts.push({
      monthYear: this.formData.monthYear,
      name: this.formData.contractName,
      type: this.formData.contractType,
      pnl: this.formData.contractPnL
    });

    this.formData.contractName = '';
    this.formData.contractPnL = null;
    this.formData.contractType = 'regular';
  }

  deleteContract(index: number) {
    this.contracts.splice(index, 1);
  }

  clearAll() {
    if (confirm('Are you sure you want to clear all contracts?')) {
      this.contracts = [];
    }
  }

  getTotalPnL(): number {
    return this.contracts.reduce((sum, c) => sum + c.pnl, 0);
  }

  getTotalProfit(): number {
    return this.contracts.filter(c => c.pnl > 0).reduce((sum, c) => sum + c.pnl, 0);
  }

  getTotalLoss(): number {
    return Math.abs(this.contracts.filter(c => c.pnl < 0).reduce((sum, c) => sum + c.pnl, 0));
  }

  getRegularProfitTotal(): number {
    return this.contracts
      .filter(c => c.type === 'regular' && c.pnl > 0)
      .reduce((sum, c) => sum + c.pnl, 0);
  }

  getRegularLossTotal(): number {
    return Math.abs(this.contracts
      .filter(c => c.type === 'regular' && c.pnl < 0)
      .reduce((sum, c) => sum + c.pnl, 0));
  }

  getMajorProfits(): Contract[] {
    return this.contracts
      .filter(c => c.type === 'regular' && c.pnl > 0)
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 12);
  }

  getMajorLosses(): Contract[] {
    return this.contracts
      .filter(c => c.type === 'regular' && c.pnl < 0)
      .sort((a, b) => a.pnl - b.pnl)
      .slice(0, 12);
  }

  getNiftyProfits(): Contract[] {
    return this.contracts
      .filter(c => c.type === 'nifty' && c.pnl > 0 && !this.isNiftyOption(c))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 5);
  }

  getNiftyLosses(): Contract[] {
    return this.contracts
      .filter(c => c.type === 'nifty' && c.pnl < 0 && !this.isNiftyOption(c))
      .sort((a, b) => a.pnl - b.pnl)
      .slice(0, 5);
  }

  getNiftyFuturesTotal(): number {
    return this.contracts
      .filter(c => c.type === 'nifty' && !this.isNiftyOption(c))
      .reduce((sum, c) => sum + c.pnl, 0);
  }

  getNiftyFuturesProfitTotal(): number {
    return this.contracts
      .filter(c => c.type === 'nifty' && !this.isNiftyOption(c) && c.pnl > 0)
      .reduce((sum, c) => sum + c.pnl, 0);
  }

  getNiftyFuturesLossTotal(): number {
    return Math.abs(this.contracts
      .filter(c => c.type === 'nifty' && !this.isNiftyOption(c) && c.pnl < 0)
      .reduce((sum, c) => sum + c.pnl, 0));
  }

  isNiftyOption(contract: Contract): boolean {
    const name = contract.name.toUpperCase();
    return name.includes('NIFTY') && (name.includes('CE') || name.includes('PE'));
  }

  getNiftyOptionsTotal(): number {
    return this.contracts
      .filter(c => this.isNiftyOption(c))
      .reduce((sum, c) => sum + c.pnl, 0);
  }

  getNiftyOptionsProfitTotal(): number {
    return this.contracts
      .filter(c => this.isNiftyOption(c) && c.pnl > 0)
      .reduce((sum, c) => sum + c.pnl, 0);
  }

  getNiftyOptionsLossTotal(): number {
    return Math.abs(this.contracts
      .filter(c => this.isNiftyOption(c) && c.pnl < 0)
      .reduce((sum, c) => sum + c.pnl, 0));
  }

  getNiftyOptionTopProfits(): Contract[] {
    return this.contracts
      .filter(c => this.isNiftyOption(c) && c.pnl > 0)
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 5);
  }

  getNiftyOptionTopLosses(): Contract[] {
    return this.contracts
      .filter(c => this.isNiftyOption(c) && c.pnl < 0)
      .sort((a, b) => a.pnl - b.pnl)
      .slice(0, 5);
  }

  getMonthName(): string {
    if (this.contracts.length === 0) return '';
    // Use the most recent (max) monthYear from all contracts to avoid relying on array order
    const latest = this.contracts
      .map(c => c.monthYear)
      .filter(Boolean)
      .reduce((max, curr) => {
        const mDate = new Date(max + '-01').getTime();
        const cDate = new Date(curr + '-01').getTime();
        return cDate > mDate ? curr : max;
      });
    const date = new Date(latest + '-01');
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  }

  formatMonth(monthYear: string): string {
    if (!monthYear) return '';
    const date = new Date(monthYear + '-01');
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  formatNumber(num: number): string {
    return Math.abs(num).toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  async exportDashboardAsImage() {
    const dashboardElement = document.getElementById('dashboard-content');
    if (!dashboardElement) {
      alert('Dashboard not found');
      return;
    }

    // Add a non-invasive solid background overlay for export clarity (beneath content)
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = '#1a2332';
    overlay.style.zIndex = '-1';
    dashboardElement.style.position = 'relative';
    dashboardElement.prepend(overlay);

    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      // Primary: html-to-image (crisper via SVG foreignObject)
      const dataUrl = await toPng(dashboardElement, {
        backgroundColor: '#1a2332',
        pixelRatio: 3,
        cacheBust: true,
      });
      overlay.remove();
      dashboardElement.style.position = '';
      const link = document.createElement('a');
      link.download = `trading-dashboard-${this.getMonthName().replace(/\s/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (primaryError) {
      // Fallback: html2canvas tuned
      try {
        const canvas = await html2canvas(dashboardElement, {
          backgroundColor: '#1a2332',
          scale: 3,
          logging: false,
          useCORS: true,
          allowTaint: false,
          width: dashboardElement.offsetWidth,
          height: dashboardElement.offsetHeight
        });
        overlay.remove();
        dashboardElement.style.position = '';
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const fileName = `trading-dashboard-${this.getMonthName().replace(/\s/g, '-')}.png`;
            link.download = fileName;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
          }
        }, 'image/png');
      } catch (fallbackError) {
        overlay.remove();
        dashboardElement.style.position = '';
        console.error('Error exporting dashboard:', fallbackError);
        alert('Failed to export dashboard. Please try again.');
      }
    }
  }
}
