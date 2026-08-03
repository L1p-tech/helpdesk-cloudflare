-- Einmalige Bereinigung: Vor dem Fix an `cleanText` wurde escapetes HTML aus
-- manchen Feeds (Golem liefert `&lt;img src=...&gt;`) erst nach dem Entfernen
-- der Tags dekodiert und landete dadurch als sichtbarer Text in der
-- Zusammenfassung.
--
-- Der Parser liefert seitdem sauberen Text, aber bereits gespeicherte
-- Meldungen werden nur aktualisiert, solange sie noch im Feed stehen. Aeltere
-- Eintraege behielten den kaputten Text, deshalb hier entfernen -- sie werden
-- beim naechsten Abruf ohnehin nicht neu angelegt, sondern sind schlicht
-- abgelaufen.
DELETE FROM news_items
WHERE summary LIKE '%<%'
   OR summary LIKE '%&amp;%'
   OR summary LIKE '%src=%';
