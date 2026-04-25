# Multimodal Phishing Detection - Edge Case Visual Summary

This document visualizes the results from the `edge_case_report.md` testing phases. It highlights the individual model performances and demonstrates the effectiveness of the Fusion Pipeline.

## 1. System Pipeline & Testing Phases

This flowchart shows the structure of the testing phases across the different modalities, culminating in the Fusion Pipeline.

```mermaid
flowchart TD
    subgraph Data Sources
        B[Benign URLs]
        P[Phishing URLs]
    end

    subgraph Phase 1: URL Model
        U_M[URL Model]
        U_FP[FPR: 9.67% on 300 URLs]
        U_FN[Detection Rate: 98.63%]
    end

    subgraph Phase 2: DOM Model
        D_M[DOM Model]
        D_FP[FPR: 5.00% on 20 URLs]
    end

    subgraph Phase 3: Visual Model
        V_M[Visual Model]
        V_FP[FPR: 86.67% on 15 URLs]
    end

    subgraph Phase 4: Fusion Pipeline
        F_M((Fusion Model))
        F_B[0.00% False Positives]
        F_P[100% Detection Rate]
    end

    B --> U_M
    P --> U_M
    U_M --> U_FP
    U_M --> U_FN

    B --> D_M
    D_M --> D_FP

    B --> V_M
    V_M --> V_FP

    U_M -.-> F_M
    D_M -.-> F_M
    V_M -.-> F_M
    
    B --> F_M
    P --> F_M
    
    F_M --> F_B
    F_M --> F_P

    style F_M fill:#2d89ef,stroke:#fff,stroke-width:2px,color:#fff
    style V_FP fill:#e81123,stroke:#fff,stroke-width:2px,color:#fff
    style F_B fill:#00a300,stroke:#fff,stroke-width:2px,color:#fff
    style F_P fill:#00a300,stroke:#fff,stroke-width:2px,color:#fff
```

## 2. False Positive Rate (FPR) Comparison

This chart highlights a critical finding from the report: while individual models (especially the Visual model) struggle with high false positive rates when tested on live benign sites, the Fusion Pipeline completely eliminates them.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#ffcccc', 'edgeLabelBackground':'#ffffff', 'tertiaryColor': '#ffffff'}}}%%
xychart-beta
    title "False Positive Rates (FPR) on Live Benign URLs"
    x-axis ["URL Model", "DOM Model", "Visual Model", "Fusion Pipeline"]
    y-axis "FPR (%)" 0 --> 100
    bar [9.67, 5.00, 86.67, 0.00]
```

## 3. Training Baseline vs Fusion Performance

This radar/spider chart conceptualizes the baseline metrics from the initial training data, showing why Fusion is superior.

```mermaid
pie title "Training Accuracy by Modality"
    "URL (98.76%)" : 98.76
    "DOM (98.49%)" : 98.49
    "Visual (88.83%)" : 88.83
    "Fusion (99.66%)" : 99.66
```

## 4. Key Takeaways from the Report

- **The Visual Model is over-sensitive alone:** It produced an 86.67% False Positive Rate on live sites (flagging sites like GitHub, Facebook, and local university pages). 
- **The URL Model flags legitimate login pages:** Many of the URL model's false positives were legitimate `login`, `signin`, or `account` pages (e.g., `daraz.pk/customer/account/login`).
- **The Fusion Pipeline fixes individual weaknesses:** By combining the modalities, the system cross-references the signals. Even though the Visual model flagged 86.67% of benign sites and the URL model flagged legitimate login pages, the **Fusion Pipeline achieved a perfect 0% FPR** on benign sites and a **100% detection rate** on live phishing sites.
