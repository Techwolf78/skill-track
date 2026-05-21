const fs = require('fs');
let content = fs.readFileSync('src/pages/SuperAdmin/Reports.tsx', 'utf8');

content = content.replace(/const topPerformers = \[[\s\S]*?function ManualResultFetcher\(\) \{/, 'export default function Reports() {');
content = content.replace(/return \(\s*<Card className="mt-8 border-primary\/20 bg-card">/, 'return (\n    <div className="p-8 space-y-6 animate-fade-in">\n      {/* Header */}\n      <div className="flex items-center justify-between">\n        <div>\n          <h1 className="text-3xl font-heading font-bold">Reports & Analytics</h1>\n          <p className="text-muted-foreground mt-1">\n            Performance insights and detailed reports\n          </p>\n        </div>\n      </div>\n\n      <Card className="border-primary/20 bg-card">');
content = content.replace(/<\/CardContent>\s*<\/Card>\s*\);\s*\}\s*export default function Reports\(\) \{[\s\S]*$/, '</CardContent>\n      </Card>\n    </div>\n  );\n}\n');

fs.writeFileSync('src/pages/SuperAdmin/Reports.tsx', content);
console.log('Successfully updated Reports.tsx');
