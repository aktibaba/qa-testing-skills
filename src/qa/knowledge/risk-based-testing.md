# Risk-Based Test Prioritization

## Principle
Allocate testing effort proportionally to risk, where risk equals the probability of failure multiplied by the business impact of that failure.

## Rationale
No team has unlimited time to test everything exhaustively. A payment processing module
with a subtle rounding bug can cost millions, while a cosmetic misalignment on an
internal admin page may never be noticed. Yet many teams allocate testing effort
uniformly---or worse, test whatever is easiest---leaving high-risk areas undercovered
and low-risk areas overtested.

Risk-based testing provides a systematic framework for deciding what to test first, how
deeply, and what to skip or defer. Each feature or component is scored on two axes:
probability of defect (based on code complexity, change frequency, developer
experience, and historical bug rates) and business impact of defect (based on user
reach, revenue effect, regulatory exposure, and reputational damage). The product of
these scores determines the risk level, which maps directly to test priority. This
approach optimizes coverage-per-hour-spent and provides stakeholders with a defensible
rationale for testing decisions.

## Pattern Examples

### 1. Risk Assessment Matrix

```
                    IMPACT
                    Low (1)    Medium (2)   High (3)     Critical (4)
                 ┌──────────┬────────────┬────────────┬──────────────┐
    High (4)     │ Medium   │ High       │ Critical   │ Critical     │
                 │ Score: 4 │ Score: 8   │ Score: 12  │ Score: 16    │
PROBABILITY      ├──────────┼────────────┼────────────┼──────────────┤
    Medium (3)   │ Low      │ Medium     │ High       │ Critical     │
                 │ Score: 3 │ Score: 6   │ Score: 9   │ Score: 12    │
                 ├──────────┼────────────┼────────────┼──────────────┤
    Low (2)      │ Low      │ Low        │ Medium     │ High         │
                 │ Score: 2 │ Score: 4   │ Score: 6   │ Score: 8     │
                 ├──────────┼────────────┼────────────┼──────────────┤
    Rare (1)     │ Accept   │ Low        │ Low        │ Medium       │
                 │ Score: 1 │ Score: 2   │ Score: 3   │ Score: 4     │
                 └──────────┴────────────┴────────────┴──────────────┘

Risk Level Mapping:
  Critical (12-16): Automate extensively, include in smoke suite, test every build.
  High (8-11):      Full test coverage, include in regression suite.
  Medium (4-7):     Core happy-path coverage, test on release candidates.
  Low (1-3):        Minimal or exploratory testing, test when time permits.
```

### 2. Risk Scoring Implementation

```python
# qa/risk_scoring.py
"""Risk scoring engine for test prioritization."""

from dataclasses import dataclass, field
from enum import IntEnum
from typing import Optional


class Probability(IntEnum):
    """Likelihood of a defect occurring."""
    RARE = 1       # Stable code, no recent changes, simple logic.
    LOW = 2        # Minor changes, well-understood code.
    MEDIUM = 3     # Moderate complexity, recent refactoring.
    HIGH = 4       # New code, high complexity, frequent changes.


class Impact(IntEnum):
    """Business impact if a defect reaches production."""
    LOW = 1        # Internal tools, cosmetic issues.
    MEDIUM = 2     # Feature degradation, workaround available.
    HIGH = 3       # Core feature broken, data integrity risk.
    CRITICAL = 4   # Revenue loss, security breach, regulatory violation.


@dataclass
class RiskFactor:
    """Individual factor contributing to risk assessment."""
    name: str
    probability: Probability
    impact: Impact
    notes: str = ""

    @property
    def score(self) -> int:
        return self.probability * self.impact

    @property
    def level(self) -> str:
        s = self.score
        if s >= 12:
            return "CRITICAL"
        elif s >= 8:
            return "HIGH"
        elif s >= 4:
            return "MEDIUM"
        else:
            return "LOW"


@dataclass
class FeatureRiskAssessment:
    """Aggregate risk assessment for a feature or component."""
    feature: str
    factors: list[RiskFactor] = field(default_factory=list)
    owner: Optional[str] = None

    def add_factor(self, name: str, probability: Probability, impact: Impact, notes: str = ""):
        self.factors.append(RiskFactor(name, probability, impact, notes))

    @property
    def max_score(self) -> int:
        return max((f.score for f in self.factors), default=0)

    @property
    def avg_score(self) -> float:
        if not self.factors:
            return 0.0
        return sum(f.score for f in self.factors) / len(self.factors)

    @property
    def overall_level(self) -> str:
        s = self.max_score
        if s >= 12:
            return "CRITICAL"
        elif s >= 8:
            return "HIGH"
        elif s >= 4:
            return "MEDIUM"
        else:
            return "LOW"

    def summary(self) -> str:
        lines = [
            f"Feature: {self.feature}",
            f"Overall Risk: {self.overall_level} (max score: {self.max_score}, avg: {self.avg_score:.1f})",
            f"Owner: {self.owner or 'Unassigned'}",
            "",
            "Risk Factors:",
        ]
        for f in sorted(self.factors, key=lambda x: x.score, reverse=True):
            lines.append(
                f"  [{f.level:8s}] {f.name} "
                f"(P={f.probability.name}, I={f.impact.name}, Score={f.score})"
            )
            if f.notes:
                lines.append(f"             {f.notes}")
        return "\n".join(lines)


# ---------- Example: Assess an e-commerce checkout feature ----------

def assess_checkout() -> FeatureRiskAssessment:
    assessment = FeatureRiskAssessment(
        feature="Checkout Flow",
        owner="payments-team",
    )

    assessment.add_factor(
        "Payment processing",
        Probability.MEDIUM, Impact.CRITICAL,
        "Stripe integration, handles real money. Recent migration to new API version.",
    )
    assessment.add_factor(
        "Cart total calculation",
        Probability.HIGH, Impact.HIGH,
        "Complex discount/coupon logic, recently refactored. Historical bugs in rounding.",
    )
    assessment.add_factor(
        "Address validation",
        Probability.LOW, Impact.MEDIUM,
        "Uses third-party API, stable for 6 months.",
    )
    assessment.add_factor(
        "Order confirmation email",
        Probability.LOW, Impact.LOW,
        "Template-based, rarely changes. Failure is recoverable.",
    )

    return assessment


if __name__ == "__main__":
    print(assess_checkout().summary())
```

**Output:**

```
Feature: Checkout Flow
Overall Risk: CRITICAL (max score: 12, avg: 7.0)
Owner: payments-team

Risk Factors:
  [CRITICAL] Payment processing (P=MEDIUM, I=CRITICAL, Score=12)
             Stripe integration, handles real money. Recent migration to new API version.
  [HIGH    ] Cart total calculation (P=HIGH, I=HIGH, Score=12)
             Complex discount/coupon logic, recently refactored. Historical bugs in rounding.
  [LOW     ] Address validation (P=LOW, I=MEDIUM, Score=4)
             Uses third-party API, stable for 6 months.
  [LOW     ] Order confirmation email (P=LOW, I=LOW, Score=2)
             Template-based, rarely changes. Failure is recoverable.
```

### 3. Test Priority Mapping from Risk Scores

```python
# qa/test_priority.py
"""Map risk assessments to concrete testing strategies."""

from dataclasses import dataclass


@dataclass
class TestStrategy:
    """Testing approach for a given risk level."""
    level: str
    automation_target: str
    suite_inclusion: list[str]
    review_frequency: str
    coverage_goal: str
    exploratory: str


STRATEGIES = {
    "CRITICAL": TestStrategy(
        level="CRITICAL",
        automation_target="100% of happy paths + all known edge cases",
        suite_inclusion=["smoke", "regression", "pre-deploy", "post-deploy"],
        review_frequency="Every sprint",
        coverage_goal="95%+ line and branch coverage",
        exploratory="Dedicated exploratory session each release",
    ),
    "HIGH": TestStrategy(
        level="HIGH",
        automation_target="All happy paths + top 5 edge cases",
        suite_inclusion=["regression", "pre-deploy"],
        review_frequency="Every 2 sprints",
        coverage_goal="80%+ line coverage",
        exploratory="Ad-hoc exploratory when changes are made",
    ),
    "MEDIUM": TestStrategy(
        level="MEDIUM",
        automation_target="Happy path only",
        suite_inclusion=["regression"],
        review_frequency="Quarterly",
        coverage_goal="60%+ line coverage",
        exploratory="Only when bugs are reported",
    ),
    "LOW": TestStrategy(
        level="LOW",
        automation_target="Optional / manual only",
        suite_inclusion=["full-regression"],
        review_frequency="Annually",
        coverage_goal="No explicit target",
        exploratory="None planned",
    ),
}


def get_strategy(risk_level: str) -> TestStrategy:
    return STRATEGIES[risk_level]


def generate_test_plan(assessments: list) -> str:
    """Generate a prioritized test plan from a list of feature assessments."""
    sorted_assessments = sorted(assessments, key=lambda a: a.max_score, reverse=True)

    lines = ["# Risk-Based Test Plan", ""]
    for assessment in sorted_assessments:
        strategy = get_strategy(assessment.overall_level)
        lines.extend([
            f"## {assessment.feature} [{assessment.overall_level}]",
            f"- **Risk Score:** {assessment.max_score}",
            f"- **Automation:** {strategy.automation_target}",
            f"- **Suites:** {', '.join(strategy.suite_inclusion)}",
            f"- **Coverage Goal:** {strategy.coverage_goal}",
            f"- **Review Cadence:** {strategy.review_frequency}",
            "",
        ])

    return "\n".join(lines)
```

### 4. Risk-Based Regression Test Selection

```javascript
// qa/risk-regression.js
// Select regression tests based on risk scores and changed files.

const riskRegistry = {
  // feature -> { riskScore, testPatterns, dependencies }
  "checkout": {
    riskScore: 16,
    testPatterns: [
      "tests/e2e/checkout/**",
      "tests/integration/payments/**",
      "tests/unit/cart/**",
    ],
    dependencies: ["src/services/payment*", "src/services/cart*", "src/models/order*"],
  },
  "user-auth": {
    riskScore: 12,
    testPatterns: [
      "tests/e2e/auth/**",
      "tests/integration/auth/**",
      "tests/unit/auth/**",
    ],
    dependencies: ["src/services/auth*", "src/middleware/auth*", "src/models/user*"],
  },
  "product-catalog": {
    riskScore: 6,
    testPatterns: [
      "tests/integration/products/**",
      "tests/unit/products/**",
    ],
    dependencies: ["src/services/product*", "src/models/product*"],
  },
  "admin-dashboard": {
    riskScore: 3,
    testPatterns: ["tests/e2e/admin/**"],
    dependencies: ["src/pages/admin/**"],
  },
};

/**
 * Given a list of changed files, determine which test suites to run.
 * Higher-risk features are always included; lower-risk features only if
 * their dependencies were modified.
 */
function selectRegressionTests(changedFiles, timebudgetMinutes = 30) {
  const minimatch = require("minimatch");
  const selected = [];

  // Sort features by risk score (highest first).
  const features = Object.entries(riskRegistry).sort(
    ([, a], [, b]) => b.riskScore - a.riskScore
  );

  for (const [featureName, config] of features) {
    // Always include CRITICAL features (score >= 12).
    if (config.riskScore >= 12) {
      selected.push({
        feature: featureName,
        reason: "CRITICAL risk - always included",
        patterns: config.testPatterns,
      });
      continue;
    }

    // For lower-risk features, check if dependencies were changed.
    const dependencyChanged = changedFiles.some((file) =>
      config.dependencies.some((dep) => minimatch(file, dep))
    );

    if (dependencyChanged) {
      selected.push({
        feature: featureName,
        reason: "Dependency changed",
        patterns: config.testPatterns,
      });
    }
  }

  return selected;
}

module.exports = { riskRegistry, selectRegressionTests };
```

**Usage in CI:**

```bash
#!/usr/bin/env bash
# scripts/risk-based-regression.sh
# Run regression tests selected by risk analysis.

set -euo pipefail

# Get files changed since the base branch.
CHANGED_FILES=$(git diff --name-only origin/main...HEAD)

# Feed changed files to the risk-based selector.
TEST_PATTERNS=$(node -e "
  const { selectRegressionTests } = require('./qa/risk-regression');
  const changed = process.argv.slice(1);
  const selected = selectRegressionTests(changed);
  selected.forEach(s => {
    console.error('Including: ' + s.feature + ' (' + s.reason + ')');
    s.patterns.forEach(p => console.log(p));
  });
" $CHANGED_FILES)

if [ -z "$TEST_PATTERNS" ]; then
  echo "No risk-relevant tests to run."
  exit 0
fi

# Run only the selected test patterns.
echo "$TEST_PATTERNS" | xargs npx jest --passWithNoTests
```

### 5. Probability Scoring Heuristics

```python
# qa/probability_heuristics.py
"""Compute defect probability from code metrics."""

from dataclasses import dataclass


@dataclass
class CodeMetrics:
    lines_of_code: int
    cyclomatic_complexity: int     # Average per function.
    change_frequency_30d: int      # Number of commits in last 30 days.
    bug_count_90d: int             # Bugs reported in last 90 days.
    test_coverage_pct: float       # Current line coverage percentage.
    age_days: int                  # Days since first commit.
    num_contributors_30d: int      # Distinct authors in last 30 days.


def compute_probability_score(metrics: CodeMetrics) -> int:
    """
    Compute a probability score from 1 (rare) to 4 (high).
    Based on industry heuristics.
    """
    score = 0

    # Complexity: higher complexity = more likely to have bugs.
    if metrics.cyclomatic_complexity > 20:
        score += 4
    elif metrics.cyclomatic_complexity > 10:
        score += 3
    elif metrics.cyclomatic_complexity > 5:
        score += 2
    else:
        score += 1

    # Change frequency: code that changes often is more likely to break.
    if metrics.change_frequency_30d > 20:
        score += 4
    elif metrics.change_frequency_30d > 10:
        score += 3
    elif metrics.change_frequency_30d > 3:
        score += 2
    else:
        score += 1

    # Bug history: past bugs predict future bugs.
    if metrics.bug_count_90d > 5:
        score += 4
    elif metrics.bug_count_90d > 2:
        score += 3
    elif metrics.bug_count_90d > 0:
        score += 2
    else:
        score += 1

    # Test coverage: low coverage = higher probability of undetected defects.
    if metrics.test_coverage_pct < 30:
        score += 4
    elif metrics.test_coverage_pct < 60:
        score += 3
    elif metrics.test_coverage_pct < 80:
        score += 2
    else:
        score += 1

    # Average the subscores and round to nearest level.
    avg = score / 4
    if avg >= 3.5:
        return 4  # HIGH
    elif avg >= 2.5:
        return 3  # MEDIUM
    elif avg >= 1.5:
        return 2  # LOW
    else:
        return 1  # RARE
```
