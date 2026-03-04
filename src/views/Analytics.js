import React from "react";
import classNames from "classnames";
import { Line, Bar } from "react-chartjs-2";
import {
  Card, CardHeader, CardBody, CardTitle,
  Row, Col, Button, ButtonGroup, Badge, Progress,
} from "reactstrap";
import { chartEngagement, chartPostsPerPlatform, chartPlatformViews, chartClipsOverTime } from "variables/charts.js";

const PLATFORM_COLOR = { tiktok: "danger", instagram: "warning", youtube: "info" };

function fmtNum(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function Analytics() {
  const [analytics, setAnalytics] = React.useState(null);
  const [period,    setPeriod]    = React.useState("week");

  React.useEffect(() => {
    const load = () => fetch("/api/analytics").then((r) => r.json()).then(setAnalytics).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const totalViews  = analytics?.total_views    ?? 0;
  const totalLikes  = analytics?.total_likes    ?? 0;
  const totalShares = analytics?.total_shares   ?? 0;
  const topClips    = analytics?.top_clips      ?? [];
  const byPlatform  = analytics?.by_platform    ?? {};

  // Compute platform share percentages
  const totalByPlatform = Object.values(byPlatform).reduce((a, d) => a + d.views, 0);
  const platformEntries = Object.entries(byPlatform).sort((a, b) => b[1].views - a[1].views);

  return (
    <>
      <div className="content">
        <Row>
          {[
            { label: "Total Views",   value: fmtNum(totalViews),  icon: "icon-world",      cls: "icon-info" },
            { label: "Total Likes",   value: fmtNum(totalLikes),  icon: "icon-heart-2",    cls: "icon-warning" },
            { label: "Shares",        value: fmtNum(totalShares), icon: "icon-refresh-02", cls: "icon-success" },
            { label: "New Followers", value: "—",                 icon: "icon-single-02",  cls: "icon-danger" },
          ].map((s) => (
            <Col lg="3" md="6" key={s.label}>
              <Card className="card-stats">
                <CardBody>
                  <Row>
                    <Col xs="5"><div className={`info-icon text-center ${s.cls}`}><i className={`tim-icons ${s.icon}`} /></div></Col>
                    <Col xs="7"><div className="numbers"><p className="card-category">{s.label}</p><CardTitle tag="h3">{s.value}</CardTitle></div></Col>
                  </Row>
                </CardBody>
              </Card>
            </Col>
          ))}
        </Row>

        <Row>
          <Col xs="12">
            <Card className="card-chart">
              <CardHeader>
                <Row>
                  <Col className="text-left" sm="6">
                    <h5 className="card-category">Cross-Platform</h5>
                    <CardTitle tag="h2">Views &amp; Engagement Over Time</CardTitle>
                  </Col>
                  <Col sm="6" className="text-right">
                    <ButtonGroup className="btn-group-toggle" data-toggle="buttons">
                      {["week", "month", "year"].map((p) => (
                        <Button key={p} tag="label" size="sm" color="info"
                          className={classNames("btn-simple", { active: period === p })}
                          onClick={() => setPeriod(p)}
                          style={{ textTransform: "capitalize" }}>
                          {p === "week" ? "7D" : p === "month" ? "30D" : "1Y"}
                        </Button>
                      ))}
                    </ButtonGroup>
                  </Col>
                </Row>
              </CardHeader>
              <CardBody>
                <div className="chart-area">
                  <Line data={chartClipsOverTime["views"]} options={chartClipsOverTime.options} />
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col lg="6">
            <Card className="card-chart">
              <CardHeader>
                <h5 className="card-category">By Platform</h5>
                <CardTitle tag="h3"><i className="tim-icons icon-send text-primary" /> Posts per Platform</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="chart-area">
                  <Bar data={chartPostsPerPlatform.data} options={chartPostsPerPlatform.options} />
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col lg="6">
            <Card className="card-chart">
              <CardHeader>
                <h5 className="card-category">Engagement Rate</h5>
                <CardTitle tag="h3"><i className="tim-icons icon-heart-2 text-warning" /> Weekly Trend</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="chart-area">
                  <Line data={chartEngagement.data} options={chartEngagement.options} />
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col lg="4">
            <Card>
              <CardHeader><CardTitle tag="h4">Platform Share</CardTitle></CardHeader>
              <CardBody>
                {platformEntries.length > 0 ? (
                  platformEntries.map(([pl, data]) => {
                    const pct = totalByPlatform > 0 ? Math.round((data.views / totalByPlatform) * 100) : 0;
                    return (
                      <div className="mb-3" key={pl}>
                        <div className="d-flex justify-content-between mb-1">
                          <span style={{ color: "#fff" }}>
                            <Badge color={PLATFORM_COLOR[pl.toLowerCase()] || "secondary"} pill className="mr-2">
                              {pl.slice(0, 2).toUpperCase()}
                            </Badge>
                            {pl.charAt(0).toUpperCase() + pl.slice(1)}
                          </span>
                          <span style={{ color: "#fff", fontWeight: 700 }}>{pct}%</span>
                        </div>
                        <Progress value={pct} color={PLATFORM_COLOR[pl.toLowerCase()] || "info"} style={{ height: 8 }} />
                      </div>
                    );
                  })
                ) : (
                  <p style={{ color: "#9a9a9a", textAlign: "center", padding: "1rem 0" }}>No platform data yet.</p>
                )}
                {platformEntries.length > 0 && (
                  <>
                    <hr style={{ borderColor: "rgba(255,255,255,0.1)" }} />
                    <div className="text-center mt-2">
                      <p style={{ color: "#9a9a9a", fontSize: "0.8rem", marginBottom: 4 }}>Best Performing</p>
                      <Badge color={PLATFORM_COLOR[platformEntries[0]?.[0]?.toLowerCase()] || "info"} style={{ fontSize: "0.95rem", padding: "6px 14px" }}>
                        {platformEntries[0]?.[0]?.charAt(0).toUpperCase() + platformEntries[0]?.[0]?.slice(1)}
                      </Badge>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </Col>

          <Col lg="8">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">Top Performing Clips</CardTitle>
                <p className="card-category">Sorted by total views</p>
              </CardHeader>
              <CardBody>
                {topClips.length === 0 ? (
                  <p style={{ color: "#9a9a9a", textAlign: "center", padding: "2rem 0" }}>
                    No posted clips yet. Approve and post clips to see analytics here.
                  </p>
                ) : (
                  <div className="table-responsive">
                    <table className="table tablesorter">
                      <thead className="text-primary">
                        <tr>
                          <th>#</th>
                          <th>Clip</th>
                          <th>Platform</th>
                          <th className="text-center">Views</th>
                          <th className="text-center">Likes</th>
                          <th className="text-center">Shares</th>
                          <th className="text-center">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topClips.map((clip, i) => (
                          <tr key={clip.id}>
                            <td style={{ color: "#9a9a9a" }}>{i + 1}</td>
                            <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {clip.title}
                            </td>
                            <td>
                              <Badge color={PLATFORM_COLOR[clip.platform?.toLowerCase()] || "secondary"} pill>
                                {clip.platform}
                              </Badge>
                            </td>
                            <td className="text-center" style={{ fontWeight: 700 }}>{fmtNum(clip.views)}</td>
                            <td className="text-center" style={{ color: "#9a9a9a" }}>{fmtNum(clip.likes)}</td>
                            <td className="text-center" style={{ color: "#9a9a9a" }}>{fmtNum(clip.shares)}</td>
                            <td className="text-center">
                              <span style={{ color: clip.viral_score >= 90 ? "#00d6b4" : "#1f8ef1", fontWeight: 700 }}>
                                {clip.viral_score?.toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
}

export default Analytics;
