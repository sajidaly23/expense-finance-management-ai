const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/ai-insights/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Extract pieces using simple regex or string splits
const leftColStart = '{/* LEFT COLUMN (Cols 1-3): Category Breakdown & Outlier Cards */}';
const leftColEnd = '          {/* CENTER STAGE';

const leftColContent = content.substring(content.indexOf(leftColStart), content.indexOf(leftColEnd));

const catPieMatch = leftColContent.match(/\{\/\* Category Pie \*\/\}.*?<\/div>\n\n/s);
const catPie = catPieMatch ? catPieMatch[0] : '';

const smartRecMatch = leftColContent.match(/\{\/\* Smart Recommendations \*\/\}.*?<\/div>\n\n/s);
const smartRec = smartRecMatch ? smartRecMatch[0] : '';

const anomalyMatch = leftColContent.match(/\{\/\* Anomaly Detection Cards \*\/\}.*?<\/div>\n/s);
const anomaly = anomalyMatch ? anomalyMatch[0] : '';

// 2. Remove left column entirely
content = content.replace(leftColContent, '');

// 3. Modify Center column
// Change <div className="lg:col-span-5 ..."> to wrap it inside lg:col-span-8
const centerStartMarker = '{/* CENTER STAGE (Cols 4-8): Prominent, Spacious AI Chatbot! */}';
content = content.replace(
  centerStartMarker + '\n          <div className="lg:col-span-5 bg-slate-900 border-2 border-slate-700 rounded-2xl flex flex-col h-[760px] shadow-lg overflow-hidden">',
  '{/* LEFT / CENTER COLUMN: Chatbot & Anomalies */}\n          <div className="lg:col-span-8 space-y-6">\n            <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl flex flex-col h-[760px] shadow-lg overflow-hidden">'
);

// Close the wrapper for center column and append Anomalies
const rightColStart = '{/* RIGHT COLUMN (Cols 9-12): ML Forecast Lab Graph Shifted to Right Side! */}';
content = content.replace(
  '          </div>\n\n          ' + rightColStart,
  '            </div>\n            ' + anomaly + '          </div>\n\n          ' + rightColStart
);

// 4. Append Category Pie and Smart Rec to Right Column
const rightColEnd = '          </div>\n\n        </div>\n      </div>\n    </AppLayout>';
content = content.replace(
  rightColEnd,
  '\n            ' + catPie + '            ' + smartRec + rightColEnd
);

// Also change lg:col-span-4 to lg:col-span-4? Or maybe make the center col-span-8? Wait, if 8 + 4 = 12, it works perfectly.
// Let's replace the grid class so we know it's there.
fs.writeFileSync(filePath, content, 'utf8');
console.log('Layout rearranged successfully.');
