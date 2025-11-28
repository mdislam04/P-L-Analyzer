import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="help-container">
      <h1>📚 Trading Dashboard – Help</h1>
      <p class="intro">This page explains the key metrics shown in the dashboards with simple examples so you can interpret performance quickly and consistently.</p>

      <div class="section">
        <h2>Net P&L</h2>
        <p><strong>Definition:</strong> Total realized profits minus total realized losses.</p>
        <p><strong>Formula:</strong> Net P&L = Sum(₹P&L of all trades)</p>
        <p><strong>Example:</strong> Trades: +₹2,000, −₹800, +₹500 → Net P&L = ₹2,000 − ₹800 + ₹500 = <strong>+₹1,700</strong>.</p>
      </div>

      <div class="section">
        <h2>Win Rate</h2>
        <p><strong>Definition:</strong> Percentage of winning trades.</p>
        <p><strong>Formula:</strong> Win Rate = (Number of Winners ÷ Total Trades) × 100</p>
        <p><strong>Example:</strong> 3 winners out of 5 trades → Win Rate = 3/5 × 100 = <strong>60%</strong>.</p>
      </div>

      <div class="section">
        <h2>Average Win / Average Loss</h2>
        <p><strong>Definition:</strong> Mean profit of winning trades and mean absolute loss of losing trades.</p>
        <p><strong>Formula:</strong> Avg Win = Sum(Profits) ÷ Winners; Avg Loss = |Sum(Losses)| ÷ Losers</p>
        <p><strong>Example:</strong> Wins: +₹2,000, +₹1,000, +₹500 → Avg Win = ₹3,500/3 = <strong>₹1,166.67</strong>.<br>
        Losses: −₹800, −₹700 → Avg Loss = ₹1,500/2 = <strong>₹750</strong>.</p>
      </div>

      <div class="section">
        <h2>Profit Factor (PF)</h2>
        <p><strong>Definition:</strong> Ratio of gross profits to gross losses. Higher is better.</p>
        <p><strong>Formula:</strong> PF = Sum(Profits) ÷ |Sum(Losses)|</p>
        <p><strong>Example:</strong> Profits ₹3,500; Losses ₹1,500 → PF = 3500/1500 = <strong>2.33</strong> (earn ₹2.33 for every ₹1 lost).</p>
        <ul class="bullets">
          <li><strong>PF &gt; 1</strong>: Profitable overall</li>
          <li><strong>PF ≈ 1</strong>: Breakeven</li>
          <li><strong>PF &lt; 1</strong>: Losing overall</li>
        </ul>
        <p><strong>Use:</strong> Quickly compare strategies (Regular vs NIFTY, Futures vs Options). Combine with win rate and drawdown to judge robustness.</p>
      </div>

      <div class="section">
        <h2>Max Drawdown</h2>
        <p><strong>Definition:</strong> Largest peak-to-trough decline in cumulative P&L.</p>
        <p><strong>Example:</strong> Equity path ₹0 → ₹1,000 → ₹600 → ₹1,200 → ₹900 → Max drawdown is <strong>₹400</strong> (from ₹1,000 down to ₹600).</p>
        <p><strong>Use:</strong> Risk indicator; large drawdowns may require position sizing or risk limits.</p>
      </div>

      <div class="section">
        <h2>Streaks (Win/Loss)</h2>
        <p><strong>Definition:</strong> Longest sequence of consecutive winning or losing trades.</p>
        <p><strong>Use:</strong> Highlights consistency or stress periods; useful for behavioral and risk checks.</p>
      </div>

      <div class="section">
        <h2>Category Splits</h2>
        <p><strong>Regular vs NIFTY:</strong> Compare performance across non-index vs index contracts.</p>
        <p><strong>NIFTY Futures vs Options:</strong> Separate directional futures from CE/PE options.</p>
        <p><strong>NIFTY Options Profit vs Loss:</strong> Understand options’ payoff balance to optimize strategy selection.</p>
      </div>

      <div class="tips">
        <h3>Tips</h3>
        <ul class="bullets">
          <li><strong>Sort & limit:</strong> Top lists are capped for readability.</li>
          <li><strong>Signs & colors:</strong> Green = profit, Red = loss; labels show +/− explicitly.</li>
          <li><strong>Format:</strong> Values use Indian locale formatting for clarity.</li>
          <li><strong>Excel:</strong> Upload: Column A Symbol, Column B Realized P&amp;L; NIFTY auto-detected if name contains "NIFTY".</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .help-container { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; }
    h1 { color: #ffc107; font-size: 1.6em; letter-spacing: 1px; margin-bottom: 10px; }
    .intro { color: #bbb; margin-bottom: 20px; }
    .section { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; }
    h2 { font-size: 1.1em; color: #fff; margin-bottom: 8px; }
    p { font-size: 0.95em; color: #ddd; }
    .bullets { margin: 8px 0 0 16px; color: #ccc; }
    .bullets li { margin: 4px 0; }
    .tips { margin-top: 16px; }
    h3 { color: #ffc107; font-size: 1em; margin-bottom: 6px; }
  `]
})
export class HelpComponent {}
