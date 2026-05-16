const fs = require("fs");
try {
  fs.unlinkSync(".next/dev/lock");
} catch {
  // no lock file — ok
}
