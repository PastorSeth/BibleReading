/* ============================================================
   THE GOSPEL — the Extras page "What is the Gospel?", from Seth's
   First Ten Days study (Day 5). Four parts, God, Man, Jesus and
   Response, scroll up under a hand-drawn Gospel bridge that draws
   itself as each part is read (app.js does the drawing).

   Each part: paragraphs (strings), an optional list of
   [bold lead, the rest] pairs, and its verse.
   ============================================================ */

const GOSPEL_INTRO = [
  'The Gospel is the good news of Jesus Christ. This Gospel is the foundation of everything we believe as Christians.',
  'The Gospel is important to understand because others need to know this truth. But it’s just as important to understand because you also need to know it, and continue to grow in this knowledge.',
];

const GOSPEL_PARTS = [
  {
    name: 'God',
    paragraphs: [
      'In the beginning, God created the world and everything was PERFECT.',
      'Everything that exists was created to find true fulfillment in fellowship with God. And in the beginning, everything that existed DID find its true fulfillment in God.',
      'God is PERFECT, and His desire for your life is PERFECT.',
    ],
    list: [
      ['God is Glorious.', 'The very attribute of God’s perfection demands our worship.'],
      ['God is Just.', 'He is so perfect that He cannot tolerate anything less than perfection.'],
      ['God is Holy.', 'He is so perfect that we cannot stand to be in His presence if we are not perfectly in accord with His standards.'],
    ],
    verse: ['Isaiah 6:5', '“Woe to me!” I cried. “I am ruined! For I am a man of unclean lips, and I live among a people of unclean lips, and my eyes have seen the King, the LORD Almighty.”'],
  },
  {
    name: 'Man',
    paragraphs: [
      'We’ve sinned. We’ve messed up and fallen short of God’s standards. We have all alienated ourselves from God because of our actions.',
      'Though we were designed to be in communion with God, our sin has become a chasm that separates us from God, and there is nothing we can do to overcome it.',
      'When we look to ourselves to try and fix our problem, there is no hope for restoration. Sin can’t satisfy our soul, and nobody can be righteous enough to stand before God’s holiness.',
    ],
    verse: ['Isaiah 59:2', 'But your iniquities have separated you from your God; your sins have hidden his face from you, so that he will not hear.'],
  },
  {
    name: 'Jesus',
    paragraphs: [
      'Jesus is the second person of the eternal, triune God.',
      'He was fully God and fully man. He left heaven to come and live the perfect, sinless life that you and I were supposed to live.',
      'He died the death that we deserved, in our place. He was the perfect sacrifice.',
      'He took on the wrath of God in our place. And three days later, He rose again, proving that His payment was accepted and that sin and death had been conquered.',
    ],
    verse: ['2 Corinthians 5:21', 'God made him who had no sin to be sin for us, so that in him we might become the righteousness of God.'],
  },
  {
    name: 'Response',
    paragraphs: [
      'For ANYONE who puts their faith in Jesus, their sin is credited to Jesus and His righteousness is credited to them.',
      'Understand this: it’s not enough to simply KNOW this truth. You have to do something about it!',
      'Putting your faith in Jesus means repenting of your sins and making Jesus the Lord of your life. It means looking to Jesus to satisfy you instead of anything else in this world.',
    ],
    verse: ['Romans 4:24–25', '…but also for us, to whom God will credit righteousness—for us who believe in him who raised Jesus our Lord from the dead. He was delivered over to death for our sins and was raised to life for our justification.'],
  },
];

/* The Gospel bridge, drawn like a sketch on a napkin: God's cliff on the
   right, ours on the left, the pit of sin between, the cross spanning it,
   and a person who walks across in faith. God's light and the cross are
   in the plan's muted yellow, the faith arrow and words in its muted
   blue, and SIN in red. The lines were roughened by hand
   once (so they wobble the same on every visit) and are kept as they are.
   Each line and label has a data-at window: the stretch of reading, from
   0 (God begins) to 4 (Response ends), over which it is drawn. */
const BRIDGE_SUMMARY = 'The Gospel bridge: God on one side and man on the other, with sin as the gap between them, and the cross of Jesus bridging it so that a person can cross over to God in faith.';
const BRIDGE_ART = `
  <path d="M252.1,228.0L251.5,225.0L250.9,222.0L250.7,219.1L250.8,216.1L251.0,213.1L251.1,210.1L251.0,207.1L250.7,204.1L250.5,201.1L250.5,198.1L250.8,195.1L251.4,192.2L251.8,189.2L252.1,186.2L252.1,183.2L252.0,180.2L252.0,177.2L252.3,174.2L252.7,171.2L253.1,168.3L253.3,165.3L253.1,162.3L252.8,159.3L252.4,156.3L252.1,153.3L252.1,150.3L252.1,147.3L252.0,144.3L251.5,141.4L251.0,138.4L250.9,135.3L251.6,132.3L252.9,129.5L254.9,127.1L257.3,125.1L259.8,123.3L262.4,121.7L265.2,120.3L268.2,119.4L271.2,119.0L274.3,119.1L277.4,119.5L280.3,119.7L283.3,119.7L286.3,119.6L289.3,119.5L292.3,119.7L295.3,120.1L298.3,120.6L301.3,121.0L304.2,121.1L307.2,120.9L310.2,120.6L313.2,120.5L316.2,120.6L319.2,120.8L322.2,120.9L325.2,120.8L328.1,120.4L331.1,119.9L334.1,119.4L337.1,119.2L340.1,119.2L343.1,119.3L346.1,119.2L349.0,118.8L352.0,118.3L354.9,117.8L357.9,117.6" pathLength="1" data-at="0,0.45"/><path class="again" d="M252.3,228.0L253.0,225.0L253.0,222.0L252.7,219.0L252.5,216.0L252.9,213.1L253.5,210.1L253.7,207.1L253.2,204.1L252.4,201.1L251.8,198.1L251.7,195.1L251.9,192.2L251.8,189.2L251.2,186.2L250.4,183.2L249.9,180.2L250.2,177.2L250.8,174.2L251.1,171.2L251.0,168.3L250.7,165.3L250.8,162.3L251.5,159.3L252.4,156.3L252.8,153.3L252.7,150.3L252.2,147.3L252.1,144.3L252.3,141.3L252.9,138.5L253.3,135.9L253.5,133.1L254.0,130.2L255.4,127.5L257.6,125.5L260.1,123.9L262.7,122.3L265.3,120.5L268.1,119.0L271.2,118.3L274.3,118.4L277.3,118.9L280.3,119.0L283.3,118.7L286.3,118.5L289.3,118.8L292.3,119.7L295.3,120.6L298.3,121.0L301.3,120.9L304.2,120.6L307.2,120.8L310.2,121.4L313.2,121.8L316.2,121.6L319.2,120.9L322.2,120.1L325.2,119.8L328.1,119.9L331.1,119.9L334.1,119.5L337.1,118.6L340.1,117.9L343.0,117.8L346.0,118.2L349.0,118.6L352.0,118.6L355.0,118.1L357.9,117.8" pathLength="1" data-at="0.158,0.563"/>
  <g class="god rays">
  <path d="M295.6,69.0 Q288.7,69.9 281.8,70.1" pathLength="1" data-at="0.440,0.490"/>
  <path d="M297.9,56.2 Q293.8,50.5 288.8,45.7" pathLength="1" data-at="0.500,0.550"/>
  <path d="M317.0,46.3 Q316.8,39.7 318.1,33.1" pathLength="1" data-at="0.560,0.610"/>
  <path d="M337.1,58.8 Q344.4,52.9 350.7,46.0" pathLength="1" data-at="0.620,0.670"/>
  <path d="M337.7,69.6 Q344.9,68.5 352.1,68.6" pathLength="1" data-at="0.680,0.730"/>
  </g>
  <text class="hand" x="318" y="85" data-at="0.22,0.42" font-size="34.5">GOD</text>
  <text class="hand" x="306" y="146" data-at="0.75,0.83" font-size="18.4">Perfect</text>
  <text class="hand" x="306" y="166" data-at="0.84,0.91" font-size="18.4">Just</text>
  <text class="hand" x="306" y="186" data-at="0.92,0.99" font-size="18.4">Holy</text>
  <path d="M1.9,120.3L5.0,120.4L8.0,120.8L11.1,121.2L14.1,121.4L17.1,121.3L20.1,121.1L23.1,120.9L26.2,121.0L29.2,121.3L32.2,121.6L35.2,121.5L38.2,121.2L41.3,120.7L44.3,120.3L47.3,120.2L50.3,120.3L53.3,120.5L56.4,120.4L59.4,120.0L62.4,119.6L65.4,119.3L68.4,119.4L71.4,119.7L74.5,120.0L77.5,120.1L80.5,119.9L83.5,119.5L86.5,119.5L89.6,120.0L92.4,121.0L95.1,122.3L97.6,123.7L100.0,125.2L102.2,127.0L104.0,129.3L105.2,131.9L105.9,134.8L106.4,137.6L107.0,140.5L107.7,143.5L108.4,146.5L108.9,149.5L109.1,152.5L109.1,155.5L109.0,158.5L109.2,161.6L109.6,164.6L110.0,167.6L110.1,170.6L109.9,173.7L109.4,176.7L108.9,179.7L108.7,182.7L108.7,185.7L108.7,188.8L108.6,191.8L108.1,194.8L107.5,197.8L107.1,200.8L107.0,203.8L107.2,206.9L107.6,209.9L107.7,212.9L107.7,216.0L107.6,219.0L107.7,222.0L108.1,225.0L108.9,228.0" pathLength="1" data-at="1,1.3"/><path class="again" d="M1.9,119.9L4.9,119.3L7.9,118.8L11.0,118.9L14.0,119.5L17.1,120.1L20.1,120.5L23.1,120.4L26.2,120.2L29.2,120.3L32.2,120.8L35.2,121.6L38.2,122.2L41.2,122.2L44.3,121.9L47.3,121.5L50.3,121.6L53.3,122.0L56.3,122.4L59.4,122.3L62.4,121.7L65.4,120.9L68.4,120.3L71.5,120.3L74.5,120.4L77.5,120.3L80.5,119.7L83.4,118.8L86.5,118.1L89.8,118.1L92.9,119.0L95.8,120.4L98.6,121.9L101.4,123.5L103.9,125.5L105.8,128.2L106.8,131.3L107.0,134.5L107.1,137.5L107.3,140.5L107.7,143.5L108.0,146.5L107.9,149.5L107.3,152.5L106.8,155.6L106.6,158.6L107.0,161.6L107.6,164.6L107.9,167.6L107.7,170.6L107.4,173.6L107.3,176.6L107.7,179.7L108.4,182.7L109.1,185.7L109.3,188.8L109.1,191.8L108.8,194.8L108.9,197.8L109.5,200.8L110.1,203.9L110.4,206.9L110.1,209.9L109.6,212.9L109.2,215.9L109.3,218.9L109.7,221.9L110.0,224.9L109.9,227.9" pathLength="1" data-at="1.105,1.375"/>
  <text class="hand" x="27" y="77" data-at="1.45,1.65" font-size="23">MAN</text>
  <path class="pit" d="M114.2,145.4 Q119.7,150.0 125.7,154.3" pathLength="1" data-at="1.620,1.670"/>
  <path class="pit" d="M245.3,149.5 Q239.5,154.5 234.2,159.9" pathLength="1" data-at="1.690,1.740"/>
  <path class="pit" d="M112.8,165.1 Q119.1,172.2 126.3,178.5" pathLength="1" data-at="1.760,1.810"/>
  <path class="pit" d="M247.8,173.7 Q240.6,179.8 233.5,186.0" pathLength="1" data-at="1.830,1.880"/>
  <text class="hand red" x="142" y="212" data-at="1.9,2" font-size="34.5">SIN</text>
  <path class="cross thick" d="M175.1,229.0L175.1,226.0L175.2,223.0L175.2,220.0L175.1,217.0L175.0,214.0L174.9,211.0L174.9,208.0L174.9,205.0L174.9,202.0L174.8,199.0L174.7,195.9L174.7,192.9L174.8,189.9L174.9,186.9L174.9,183.9L174.8,180.9L174.8,177.9L174.8,174.9L175.0,171.9L175.1,168.9L175.1,165.9L175.1,162.9L175.1,159.9L175.1,156.9L175.3,153.9L175.3,150.9L175.3,147.9L175.2,144.9L175.1,141.9L175.1,138.9L175.2,135.8L175.2,132.8L175.1,129.8L174.9,126.8L173.8,125.1L170.8,125.1L167.8,125.1L164.8,125.1L161.8,125.2L158.8,125.3L155.8,125.3L152.8,125.2L149.8,125.1L146.8,125.1L143.8,125.2L140.8,125.2L137.8,125.1L134.8,125.0L131.8,124.9L128.8,124.9L125.8,124.9L122.7,124.9L119.7,124.8L116.7,124.7L113.7,124.7L110.7,124.7L107.7,124.8L106.1,123.7L106.2,120.7L106.2,117.7L106.2,114.7L106.3,112.1L109.3,111.9L112.3,111.9L115.3,111.9L118.3,111.9L121.3,111.9L124.3,111.8L127.3,111.7L130.3,111.7L133.3,111.8L136.3,111.9L139.4,111.8L142.4,111.8L145.4,111.8L148.4,111.9L151.4,112.0L154.4,112.1L157.4,112.1L160.4,112.1L163.4,112.1L166.4,112.2L169.4,112.3L172.4,112.3L175.2,111.6L175.2,108.6L175.1,105.6L175.2,102.6L175.2,99.6L175.2,96.6L175.0,93.6L174.9,90.6L174.9,87.5L174.9,84.5L175.0,81.5L174.9,78.5L174.7,75.5L174.7,72.5L174.7,69.5L174.8,66.5L174.9,63.5L176.5,61.8L179.5,61.8L182.5,61.8L185.5,61.9L186.0,64.5L185.9,67.5L185.9,70.5L186.0,73.5L185.9,76.5L185.8,79.5L185.7,82.5L185.7,85.5L185.8,88.6L185.9,91.6L185.8,94.6L185.8,97.6L185.8,100.6L185.8,103.6L186.0,106.6L186.1,109.6L186.6,111.9L189.6,112.0L192.6,112.0L195.6,111.9L198.6,111.7L201.6,111.7L204.6,111.7L207.6,111.8L210.6,111.9L213.6,111.8L216.6,111.8L219.6,111.8L222.7,111.9L225.7,112.0L228.7,112.1L231.7,112.0L234.7,112.0L237.7,112.1L240.7,112.2L243.7,112.3L246.7,112.3L249.7,112.2L252.7,112.1L253.8,113.7L253.8,116.7L253.8,119.7L253.9,122.7L253.3,125.0L250.3,125.1L247.3,125.1L244.3,125.0L241.3,125.1L238.3,125.2L235.2,125.3L232.2,125.3L229.2,125.2L226.2,125.2L223.2,125.2L220.2,125.2L217.2,125.3L214.2,125.2L211.2,125.1L208.2,125.0L205.2,124.9L202.2,125.0L199.2,125.0L196.2,124.9L193.2,124.8L190.2,124.7L187.2,124.7L185.8,126.8L185.9,129.8L185.8,132.8L185.7,135.8L185.8,138.9L185.9,141.9L186.0,144.9L186.1,147.9L186.0,150.9L186.0,153.9L186.1,156.9L186.2,159.9L186.3,162.9L186.3,165.9L186.2,168.9L186.2,171.9L186.2,174.9L186.2,177.9L186.3,180.9L186.2,183.9L186.0,186.9L186.0,189.9L186.0,192.9L186.0,195.9L186.0,199.0L185.9,202.0L185.7,205.0L185.7,208.0L185.8,211.0L185.8,214.0L185.8,217.0L185.8,220.0L185.7,223.0L185.8,226.0L185.9,229.0" pathLength="1" data-at="2,2.7"/>
  <text class="hand" x="180" y="52" data-at="2.6,2.9" font-size="27.6">JESUS</text>
  <text class="hand" x="54" y="164" data-at="3,3.2" font-size="20.7">RESPONSE</text>
  <text class="hand faith" x="54" y="186" data-at="3.22,3.4" font-size="23">in faith</text>
  <path class="faith" d="M71.9,142.0L72.5,139.0L73.3,136.2L74.3,133.3L75.4,130.6L76.6,127.8L77.7,125.1L79.0,122.4L80.4,119.8L82.0,117.3L83.7,114.8L85.5,112.5L87.3,110.1L89.2,107.8L91.1,105.5L93.3,103.4L95.5,101.4L97.9,99.6L100.4,97.9L102.9,96.2L105.4,94.5L108.0,93.0L110.7,91.8L113.5,90.7L116.4,89.8L119.2,88.9L122.1,88.0L125.0,87.3L127.9,86.6L130.8,86.0L133.8,85.6L136.8,85.1L139.7,84.6L142.6,84.0L145.5,83.4L148.5,82.9L151.5,82.5L154.4,82.2L157.4,81.9L160.4,81.4L163.3,81.0L166.3,80.6L169.3,80.3L172.3,80.2L175.3,80.2L178.3,80.1L181.2,80.0L184.2,79.8L187.2,79.8L190.2,80.0L193.2,80.2L196.2,80.5L199.2,80.7L202.2,80.8L205.1,81.0L208.1,81.2L211.1,81.6L214.1,82.0L217.0,82.4L220.0,82.7L223.0,82.9L226.0,83.1L228.9,83.4L231.9,83.9L234.8,84.4L237.8,84.9L240.8,85.2L243.7,85.6L246.7,86.1L249.6,86.8L252.5,87.7L255.4,88.6L258.2,89.5L261.1,90.3L263.9,91.3L266.7,92.4L269.4,93.8L272.0,95.2L274.6,96.7L277.2,98.2L279.7,99.7L282.2,101.4L284.6,103.2L286.8,105.2L288.9,107.2L291.0,109.3L293.1,111.5L295.1,113.7L297.0,116.0" pathLength="1" data-at="3,3.45"/>
  <path class="faith" d="M297.0,104.0 Q297.1,110.4 296.9,116.8" pathLength="1" data-at="3.450,3.486"/><path class="faith" d="M298.1,116.4 Q292.6,113.4 287.1,110.5" pathLength="1" data-at="3.486,3.520"/>
  <g data-who data-lift="8">
  <path class="head" d="M52.1,79.2L53.3,78.8L54.4,78.6L55.6,78.6L56.8,78.8L57.9,79.1L59.0,79.7L60.0,80.3L60.8,81.1L61.5,82.0L62.0,83.0L62.3,84.1L62.5,85.2L62.4,86.3L62.3,87.3L61.9,88.3L61.4,89.3L60.7,90.1L60.0,90.9L59.1,91.5L58.1,92.0L57.1,92.3L56.1,92.5L55.0,92.6L54.0,92.5L52.9,92.3L51.9,91.9L51.0,91.4L50.2,90.7L49.5,90.0L49.0,89.1L48.5,88.2L48.3,87.3L48.2,86.3L48.3,85.3L48.5,84.3L48.9,83.4L49.4,82.6L50.1,81.9L50.9,81.3L51.7,80.8L52.6,80.5L53.6,80.3L54.5,80.3L55.4,80.4L56.3,80.6L57.1,81.0" pathLength="1" data-at="1.3,1.42"/>
  <path d="M55.4,90.8 Q55.4,102.6 55.6,114.5" pathLength="1" data-at="1.420,1.500"/><path d="M44.9,103.4 Q55.2,103.0 65.5,102.2" pathLength="1" data-at="1.480,1.550"/>
  <path d="M56.6,112.0 Q52.3,116.3 48.0,120.8" pathLength="1" data-at="1.530,1.580"/><path d="M53.5,111.7 Q58.0,116.4 62.2,121.4" pathLength="1" data-at="1.560,1.610"/>
  </g>
`;
