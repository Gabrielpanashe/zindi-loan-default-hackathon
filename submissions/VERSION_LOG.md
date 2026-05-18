# Submission Version Log

| Version | File | Local OOF AUC | Zindi Public AUC | Model | Notes |
|---------|------|--------------|-----------------|-------|-------|
| v1 | v1_lgbm_oofAUC0.6827.csv | 0.6827 | _fill after upload_ | LightGBM default params | First submission, beat benchmark |
| v2 | v2_catboost_oofAUC0.6875.csv | 0.6875 | 0.671944 | CatBoost, native categoricals, 3000 iter | Position 17, +0.005 vs v1 locally |
| v3 | v3_ensemble_weighted_avg_oofAUC0.6870.csv | 0.6870 | _fill after upload_ | LGBM+CatBoost weighted avg | Marginally below CatBoost alone — models too similar |
| v4 | v4_catboost_optuna_oofAUC0.6884.csv | 0.6884 | 0.675558833 | CatBoost + Optuna 50 trials (lr=0.011, depth=5, l2=14.4) | Best Zindi so far |
| v5 | v5_xgboost_oofAUC0.6857.csv | 0.6857 | 0.648307258 | XGBoost label-encoded | Overfit — label encoding of categoricals hurt badly |
| v6 | v6_xgb_cb_ensemble_weighted.csv | 0.6884 | 0.665328254 | XGBoost+CatBoost weighted avg | XGBoost dragged ensemble down |
| v7 | v7_catboost_group_feats_oofAUC0.6923.csv | 0.6923 | 0.675007615 | CatBoost + group features (leaky) | High local due to leakage, worse Zindi |
| v8 | v8_catboost_leakfree_oofAUC0.6871.csv | 0.6871 | NOT SUBMITTED | CatBoost + leak-free group feats | Lower than V4 — group feats redundant for CatBoost |
| v9 | v9_catboost_fixeddates_oofAUC0.6884.csv | 0.6884 | ~0.675 | V4 params + FIXED test date parsing (was all NaT) | Slight improvement — date features not dominant |
| v10 | v10_seed_ensemble_oofAUC0.6882.csv | 0.6882 | **0.67680** | 7-seed ensemble depth=5, V4 params | BEST ZINDI — seed diversity helped |
| v11 | v11_v10_ensemble_oofAUC0.6884.csv | 0.6884 | 0.676568 | Lossguide/depth experiments + V10 combo | Marginally below V10 |
| v12 | v12_depth4_seed_ens_oofAUC0.6884.csv | 0.6884 | _fill_ | 7-seed depth=4 l2=30, 56 features | Highest local OOF 0.68841 |
| v13 | v13_lgbm_infold_oofAUC0.6836.csv | 0.6836 | NOT SUBMITTED | LightGBM with within-fold TargetEncoder | LGBM weak on this data (OOF 0.684) |
| v14 | v14_feat36_depth4_seeds_oofAUC0.6884.csv | 0.6884 | _fill_ | depth=4, 36 features (dropped bottom 20) | Feature selection had zero effect |
| v15 | _running_ | _TBD_ | _TBD_ | CatBoost + SMOTE within folds | Running |
