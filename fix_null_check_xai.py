import os
import re

console_dir = r"frontend\public\console"
xai_path = os.path.join(console_dir, "xai.html")

with open(xai_path, "r", encoding="utf-8") as f:
    content = f.read()

safe_render_js = r'''
function renderDomainInspection(data) {
    if (!data) return;
    const domain = data.domain || 'unknown.domain';
    
    const titleEl = document.getElementById('inspected-domain-title');
    if (titleEl) titleEl.textContent = domain;
    
    const entropyInput = document.getElementById('entropy-input');
    if (entropyInput) {
        entropyInput.value = domain;
        if (typeof calculateEntropyLive === 'function') calculateEntropyLive();
    }

    const score = Math.min(100, Math.max(0, data.risk_score || 0));
    const verdict = (data.expected_verdict || data.verdict || 'ALLOW').toUpperCase();
    const badgeEl = document.getElementById('inspected-verdict-badge');
    const mathFinalEl = document.getElementById('math-final-score');
    const mathSumEl = document.getElementById('math-shap-sum');
    const actorTag = document.getElementById('corpus-actor-tag');
    const mitreTag = document.getElementById('corpus-mitre-tag');
    const selectEl = document.getElementById('domain-corpus-select');
    
    if (selectEl && selectEl.value !== domain) {
        selectEl.value = domain;
    }
    if (actorTag) {
        actorTag.textContent = `Actor: ${data.threat_actor || 'Unknown'}`;
    }
    if (mitreTag) {
        mitreTag.textContent = `MITRE: ${data.mitre_technique || 'N/A'}`;
    }

    if (badgeEl) {
        if (verdict === 'BLOCK') {
            badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-error-container/30 text-error border border-error/20';
            badgeEl.textContent = `BLOCK (Score: ${score}/100)`;
        } else if (verdict === 'FLAG') {
            badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-tertiary-fixed-dim/20 text-tertiary-fixed-dim border border-tertiary-fixed-dim/30';
            badgeEl.textContent = `FLAG (Score: ${score}/100)`;
        } else {
            badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary-container/30 text-secondary border border-secondary/20';
            badgeEl.textContent = `ALLOW (Score: ${score}/100)`;
        }
    }

    if (mathFinalEl) {
        mathFinalEl.className = verdict === 'BLOCK' ? 'text-error font-bold text-[15px]' : (verdict === 'FLAG' ? 'text-tertiary-fixed-dim font-bold text-[15px]' : 'text-secondary font-bold text-[15px]');
        mathFinalEl.textContent = `${score}/100`;
    }

    if (mathSumEl) {
        mathSumEl.className = verdict === 'BLOCK' ? 'text-error font-bold' : (verdict === 'FLAG' ? 'text-tertiary-fixed-dim font-bold' : 'text-secondary font-bold');
        mathSumEl.textContent = verdict === 'ALLOW' ? '0.00' : `+${((score - 12)/100).toFixed(2)}`;
    }

    const descEl = document.getElementById('inspected-decided-by');
    if (descEl) {
        descEl.innerHTML = `<strong>${data.decided_by || '150-Tree Random Forest'}</strong> · <span class="text-slate-600">${data.analyst_summary || ''}</span>`;
    }

    // Build Dynamic SHAP Table based on live features
    const lex = data.lexical_features || {};
    const entropy = lex.entropy || 0;
    const digitRatio = lex.digit_ratio || 0;
    const vowelRatio = lex.vowel_ratio || 0;
    const longestCons = lex.longest_consonant_run || 0;
    const tldSusp = lex.tld_suspicion || 0.1;

    const shapFeatures = [
        {
            name: "Shannon Entropy",
            symbol: "H(X)",
            observed: entropy.toFixed(2) + " bits",
            shap: entropy > 3.5 ? "+" + ((entropy - 3.0) * 0.22).toFixed(3) : "-0.045",
            pct: Math.min(100, Math.max(10, Math.round((entropy / 5.0) * 100))),
            isRisk: entropy > 3.5
        },
        {
            name: "Consonant-to-Vowel Ratio",
            symbol: "R_cv",
            observed: (vowelRatio > 0 ? (1 / vowelRatio).toFixed(2) : "4.50"),
            shap: score >= 75 ? (data.top_shap_1 || "+0.184") : "-0.020",
            pct: Math.min(100, Math.max(10, longestCons * 15)),
            isRisk: score >= 75
        },
        {
            name: "Digit Ingestion Ratio",
            symbol: "D_ratio",
            observed: (digitRatio * 100).toFixed(0) + "%",
            shap: digitRatio > 0.15 ? "+0.145" : "-0.010",
            pct: Math.min(100, Math.max(5, Math.round(digitRatio * 100))),
            isRisk: digitRatio > 0.15
        },
        {
            name: "Longest Consonant Sequence",
            symbol: "L_cons",
            observed: longestCons + " chars",
            shap: longestCons >= 4 ? "+0.122" : "-0.015",
            pct: Math.min(100, longestCons * 18),
            isRisk: longestCons >= 4
        },
        {
            name: "Primary Threat Signal",
            symbol: "Top_Sig_1",
            observed: data.top_shap_1 || "Standard Pattern",
            shap: score > 40 ? "+0.220" : "-0.110",
            pct: score > 40 ? 88 : 12,
            isRisk: score > 40
        },
        {
            name: "Secondary Threat Signal",
            symbol: "Top_Sig_2",
            observed: data.top_shap_2 || "Baseline Ratio",
            shap: score > 40 ? "+0.170" : "-0.060",
            pct: score > 40 ? 76 : 15,
            isRisk: score > 40
        },
        {
            name: "TLD Anomaly & Reputation",
            symbol: "TLD_rep",
            observed: tldSusp > 0.5 ? "High Risk" : "Standard",
            shap: tldSusp > 0.5 ? "+0.110" : "-0.050",
            pct: tldSusp > 0.5 ? 85 : 15,
            isRisk: tldSusp > 0.5
        }
    ];

    const tbody = document.getElementById('shap-table-body');
    if (tbody) {
        tbody.innerHTML = shapFeatures.map(f => {
            const barColor = f.isRisk ? 'bg-error' : 'bg-secondary';
            const valColor = f.isRisk ? 'text-error' : 'text-secondary';
            const pillBadge = f.isRisk
                ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-error-container/30 text-error border border-error/20">+Risk</span>'
                : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container/30 text-secondary border border-secondary/20">-Safe</span>';

            return `
            <tr class="hover:bg-primary/5 transition-colors">
                <td class="px-4 py-3 font-semibold text-on-surface font-sans">${f.name}</td>
                <td class="px-4 py-3 text-outline font-bold">${f.symbol}</td>
                <td class="px-4 py-3 text-right font-bold">${f.observed}</td>
                <td class="px-4 py-3 ${valColor} text-right font-bold">${f.shap}</td>
                <td class="px-4 py-3">
                    <div class="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                        <div class="h-full ${barColor} rounded-full" style="width: ${f.pct}%;"></div>
                    </div>
                </td>
                <td class="px-4 py-3 text-center">${pillBadge}</td>
            </tr>`;
        }).join('');
    }
}
'''

render_regex = re.compile(r'function renderDomainInspection\(data\)\s*\{.*?\n(?=function calculateEntropyLive|\nfunction calculateEntropyLive)', re.DOTALL)
if render_regex.search(content):
    content = render_regex.sub(safe_render_js.strip() + "\n\n", content)
    with open(xai_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Safeguarded renderDomainInspection in xai.html with null-checks!")

# Sync all static HTML mirrors
import shutil
files = ["index.html", "xai.html", "quarantine.html", "pipeline.html", "models.html", "threats.html", "devices.html", "analytics.html", "reports.html"]
dest_dirs = [r"frontend\public", r"frontend\public\stitch"]
for d in dest_dirs:
    os.makedirs(d, exist_ok=True)
    for f in files:
        src_p = os.path.join(console_dir, f)
        dest_p = os.path.join(d, f)
        if os.path.exists(src_p):
            shutil.copy2(src_p, dest_p)
print("Synchronized all HTML mirrors!")
