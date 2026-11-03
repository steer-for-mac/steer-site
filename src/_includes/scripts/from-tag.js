// Posted links carry ?from=<post> so a sale can be traced to the post that
// brought the buyer. Remember the tag for this visit; buy.html hands it to the
// checkout as custom data, which Lemon Squeezy stores on the order.
try {
  const from = new URLSearchParams(location.search).get("from");
  if (from) sessionStorage.setItem("steer-from", from.slice(0, 40));
} catch { /* storage blocked: the sale just goes untagged */ }
