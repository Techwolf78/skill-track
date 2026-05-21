import re

with open('src/pages/SuperAdmin/Reports.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'const topPerformers = \[.*?function ManualResultFetcher\(\) \{', 'export default function Reports() {', content, flags=re.DOTALL)
content = re.sub(r'return \(\s*<Card className="mt-8 border-primary/20 bg-card">', 'return (\n    <div className="p-8 space-y-6 animate-fade-in">\n      {/* Header */}\n      <div className="flex items-center justify-between">\n        <div>\n          <h1 className="text-3xl font-heading font-bold">Reports & Analytics</h1>\n          <p className="text-muted-foreground mt-1">\n            Performance insights and detailed reports\n          </p>\n        </div>\n      </div>\n\n      <Card className="border-primary/20 bg-card">', content)
content = re.sub(r'</CardContent>\s*</Card>\s*\);\s*}\s*export default function Reports\(\) \{.*$', '</CardContent>\n      </Card>\n    </div>\n  );\n}\n', content, flags=re.DOTALL)

with open('src/pages/SuperAdmin/Reports.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated successfully")
