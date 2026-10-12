if command -v openclew >/dev/null 2>&1; then
  openclew index || echo "openclew: index generation failed"
  git add doc/_INDEX.md 2>/dev/null
elif command -v npx >/dev/null 2>&1; then
  npx --yes openclew index 2>/dev/null || echo "openclew: index generation failed"
  git add doc/_INDEX.md 2>/dev/null
fi
