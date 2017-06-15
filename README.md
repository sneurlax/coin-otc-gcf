# coin-otc-gcf
Google Cloud Function(s) for Coin-OTC

Deploy:

`gcloud beta functions deploy auth --stage-bucket coin-otc-gcf --trigger-http --entry-point auth`

`gcloud beta functions deploy send --stage-bucket coin-otc-gcf --trigger-http --entry-point send`

`gcloud beta functions deploy reply --stage-bucket coin-otc-gcf --trigger-http --entry-point reply`