UPDATE supplier_signals s
SET    supplier_id = sc.supplier_id
FROM   supplier_scores sc
WHERE  s.score_id = sc.id AND s.supplier_id IS NULL;
