import React from 'react';
import { ArrowLeft, FileText, Shield, Info, AlertCircle } from 'lucide-react';

export default function TermsOfServicePage() {
  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen glass-bg">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center logo-glow">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-4">Terms of Service</h1>
            <p className="text-gray-400 text-lg">
              Margine-Space.com Investment Platform
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Last updated: August 2025
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="glass-card p-8">
          <div className="prose prose-invert max-w-none">
            
            {/* Important Notice */}
            <div className="glass-modal p-6 mb-8 border-l-4 border-red-500">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-red-400 font-semibold mb-2">IMPORTANT — PLEASE READ THIS LEGAL NOTICE IN FULL</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    <strong>NOTHING ON THIS SITE CONSTITUTES LEGAL, FINANCIAL, BUSINESS, OR TAX ADVICE.</strong> 
                    BEFORE ENGAGING WITH THIS WEBSITE, THE MARGINE-SPACE.COM ECOSYSTEM, OR MARGINE-SPACE.COM DIGITAL PACKAGES, 
                    SEEK GUIDANCE FROM QUALIFIED PROFESSIONAL ADVISERS.
                  </p>
                  <p className="text-gray-300 text-sm">
                    NEITHER MARGINE-SPACE.COM, ITS FOUNDERS, DEVELOPERS, NOR ANY SERVICE PROVIDER SHALL BE LIABLE, 
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, FOR ANY DIRECT, INDIRECT, INCIDENTAL, CONSEQUENTIAL, 
                    OR OTHER LOSS OR DAMAGE ARISING FROM OR IN CONNECTION WITH YOUR ACCESS TO THIS WEBSITE, 
                    YOUR USE OF OR RELIANCE ON THE DIGITAL PACKAGES, OR ANY OTHER MATERIALS WE PUBLISH.
                  </p>
                </div>
              </div>
            </div>

            {/* Table of Contents */}
            <div className="glass-input p-6 mb-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-orange-500" />
                Table of Contents
              </h2>
              <nav className="space-y-2">
                <a href="#risk-warning" className="block text-orange-400 hover:text-orange-300 transition-colors">Risk Warning & Legal Disclaimer</a>
                <a href="#acceptance" className="block text-orange-400 hover:text-orange-300 transition-colors">1. Acceptance of the Terms</a>
                <a href="#nature" className="block text-orange-400 hover:text-orange-300 transition-colors">2. Nature of the Margine-Space.com</a>
                <a href="#eligibility" className="block text-orange-400 hover:text-orange-300 transition-colors">3. Eligibility and Prohibited Users</a>
                <a href="#modifications" className="block text-orange-400 hover:text-orange-300 transition-colors">4. Modifications to the Terms or Services</a>
                <a href="#registration" className="block text-orange-400 hover:text-orange-300 transition-colors">5. Registration; Wallet & Technology Requirements</a>
                <a href="#transactions" className="block text-orange-400 hover:text-orange-300 transition-colors">6. Transactions</a>
                <a href="#content" className="block text-orange-400 hover:text-orange-300 transition-colors">7. Use of Website Content</a>
                <a href="#conduct" className="block text-orange-400 hover:text-orange-300 transition-colors">8. Standards of Conduct & Compliance with Laws</a>
                <a href="#third-party" className="block text-orange-400 hover:text-orange-300 transition-colors">9. Third-Party Links and Platforms</a>
                <a href="#forward-looking" className="block text-orange-400 hover:text-orange-300 transition-colors">10. Forward-looking statements</a>
                <a href="#disclaimers" className="block text-orange-400 hover:text-orange-300 transition-colors">11. Disclaimers</a>
                <a href="#liability" className="block text-orange-400 hover:text-orange-300 transition-colors">12. Limitation of Liability</a>
                <a href="#indemnification" className="block text-orange-400 hover:text-orange-300 transition-colors">13. Indemnification</a>
                <a href="#governing-law" className="block text-orange-400 hover:text-orange-300 transition-colors">14. Governing Law & Dispute Resolution</a>
                <a href="#miscellaneous" className="block text-orange-400 hover:text-orange-300 transition-colors">15. Miscellaneous</a>
                <a href="#contact" className="block text-orange-400 hover:text-orange-300 transition-colors">16. Contact Us</a>
              </nav>
            </div>

            {/* Risk Warning Section */}
            <section id="risk-warning" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-red-500/30 pb-2">
                RISK WARNING & LEGAL DISCLAIMER (PLEASE READ CAREFULLY)
              </h2>
              <div className="glass-modal p-6 border-l-4 border-red-500 mb-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-red-400 font-semibold mb-2">RISK WARNING</h3>
                    <p className="text-gray-300 text-sm">
                      Trading cryptocurrencies is highly speculative, carries a level of risk, and may not be suitable for all investors. 
                      You may lose some or all of your invested capital; therefore, you should not speculate with capital that you cannot afford to lose. 
                      The content on this site should not be considered investment advice. Investing is speculative. When investing, your capital is at risk.
                    </p>
                  </div>
                </div>
              </div>
              <div className="glass-modal p-6 border-l-4 border-orange-500 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-orange-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-orange-400 font-semibold mb-2">LEGAL DISCLAIMER</h3>
                    <p className="text-gray-300 text-sm">
                      Margine-Space.com is digital package with no intrinsic value, no guaranteed utility, and are intended for entertainment purposes only. 
                      Any community features that may be built around them are experimental and not promised. Trading crypto—especially digital packages—involves significant risk and potential capital loss. 
                      Digital packages can be extremely volatile. Conduct thorough research. When you trade or purchase Margine-Space.com digital packages, 
                      you are agreeing that you have read and understood this disclaimer.
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-gray-300 space-y-4">
                <p>
                  The information on this site is not intended for residents of Afghanistan, Benin, Bhutan, Bahrain, Egypt, Kuwait, China, 
                  the Crimea region, Cuba, Iran, Iraq, North Korea, Saudi Arabia, Syria, Oman, the United Arab Emirates, the United States of America, 
                  or Vatican City, nor for use by any person in any country or jurisdiction where such distribution or use would be contrary to local law or regulation.
                </p>
                <p>
                  <strong>This website is not intended for use by residents of the United States.</strong> By accessing this site, you confirm that you are not a U.S. resident 
                  and that you are not using a VPN or any other method to disguise your location.
                </p>
                <p>
                  Please ensure you comply with the laws and regulations applicable to your jurisdiction before engaging in any cryptocurrency activities. 
                  We recommend consulting with a qualified professional if you have any questions or concerns.
                </p>
                <p className="font-semibold text-orange-400">
                  By continuing to use this website, you acknowledge that you understand these terms and agree to them.
                </p>
              </div>
            </section>

            {/* 1. Acceptance of the Terms */}
            <section id="acceptance" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-orange-500/30 pb-2">
                1. Acceptance of the Terms
              </h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  The website located at <a href="https://margine-space.com/" className="text-orange-400 hover:text-orange-300">https://margine-space.com/</a> (the "Website") is the
                  intellectual property of Margine-Space.com, a company duly incorporated and existing under the laws of the Hong Kong Special Administrative Region
                  (HKSAR) hereinafter collectively referred to as the "Company", "we," "our," or "us"). These terms and conditions (the "Terms" or this "Agreement")
                  govern your access to and use of the Website and all associated content, functionality, and services (collectively, the "Services"). 
                  These Terms expressly incorporate by reference our Privacy Policy and any other rules, policies, or documents that we may publish from time to time.
                </p>
                <p>
                  By accessing or using the Services in any manner—including, without limitation, (a) browsing the Website; (b) viewing content or third-party links;
                  (c) purchasing, holding, or transferring the Margine-Space.com digital packages known Margine-Space.com; or (d) submitting any registration or
                  contact form—you acknowledge that you have read, understood, and agreed to be bound by these Terms. If you do not agree to the Terms in
                  their entirety, you must not access or use the Services.
                </p>
                <div className="glass-modal p-4 border-l-4 border-red-500">
                  <p className="text-red-400 font-semibold text-sm">
                    THIS AGREEMENT CONTAINS DISCLAIMERS OF WARRANTIES, LIMITATIONS OF LIABILITY, RELEASES, A CLASS-ACTION WAIVER, AND A
                    BINDING ARBITRATION CLAUSE. PLEASE REVIEW CAREFULLY.
                  </p>
                </div>
              </div>
            </section>

            {/* 2. Nature of the Margine-Space.com */}
            <section id="nature" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-orange-500/30 pb-2">
                2. Nature of the Margine-Space.com
              </h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  You agree that you acquire Margine-Space.com solely to express support for, and participate in the Margine-Space.com community. 
                  Margine-Space.com acts only as an arm's-length third party in relation to the distribution of Margine-Space.com and does not act as a financial adviser or fiduciary to any participant.
                </p>
                <p>
                  The Margine-Space.com are intended solely as a digital mechanism to express support for, and to participate in, the Margine-Space.com community.
                </p>
                <div className="glass-input p-4">
                  <h3 className="text-orange-400 font-semibold mb-3">Margine-Space.com do not:</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>confer any right to dividends, revenue, or assets of Margine-Space.com or its affiliates;</li>
                    <li>represent shares, securities, commodities, bonds, units in a collective investment scheme, or any other regulated financial instrument;</li>
                    <li>create any debt owed by Margine-Space.com;</li>
                    <li>grant voting or governance rights in Margine-Space.com;</li>
                    <li>represent electronic money or a deposit;</li>
                    <li>entitle holders to any intellectual-property license beyond personal, non-commercial use.</li>
                  </ul>
                </div>
                <p>
                  You acknowledge that the acquisition, holding, or transfer of Margine-Space.com digital packages is at your sole risk and for personal utility
                  or enjoyment only. No commitment is made, expressed or implied, that Margine-Space.com will accrue value, yield revenue, or be supported by any future utility.
                </p>
              </div>
            </section>

            {/* 3. Eligibility and Prohibited Users */}
            <section id="eligibility" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-orange-500/30 pb-2">
                3. Eligibility and Prohibited Users
              </h2>
              <div className="text-gray-300 space-y-4">
                <div className="glass-input p-4">
                  <h3 className="text-orange-400 font-semibold mb-3">General Requirements</h3>
                  <p>
                    The Services are available only to individuals who are at least 18 years old (or the age of majority in their jurisdiction, if higher). 
                    This also applies to entities that are duly organized and in good standing under the laws of their jurisdiction.
                  </p>
                </div>
                <div className="glass-modal p-4 border-l-4 border-red-500">
                  <h3 className="text-red-400 font-semibold mb-3">Prohibited Users</h3>
                  <p className="mb-3">The Services are not available to:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                    <li>Persons or entities subject to economic or trade sanctions administered or enforced by any governmental authority or listed on any international sanctions list.</li>
                    <li>Persons or entities resident, located, or incorporated in jurisdictions subject to comprehensive sanctions, including those jurisdictions listed in the Risk Warning & Legal Disclaimer above.</li>
                    <li>Any other individuals or entities whose access to or use of the Services would violate applicable law.</li>
                  </ul>
                </div>
                <div className="glass-input p-4">
                  <h3 className="text-orange-400 font-semibold mb-3">Deemed Representations</h3>
                  <p className="mb-3">By accessing this Website or acquiring Margine-Space.com you represent and warrant that:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                    <li>you have not relied on any statement in the Website or related materials in deciding to acquire Margine-Space.com;</li>
                    <li>you will at your own expense ensure full compliance with all laws and regulations applicable to you;</li>
                    <li>you understand and accept that Margine-Space.com may have no value or liquidity and are not intended for speculative investment; and</li>
                    <li>none of Margine-Space.com, its affiliates, or team members guarantees the value, transferability, or availability of any market for Margine-Space.com.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 4. Modifications to the Terms or Services */}
            <section id="modifications" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-orange-500/30 pb-2">
                4. Modifications to the Terms or Services
              </h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  We reserve the right to modify these Terms or any aspect of the Services at any time in our sole discretion. 
                  Updated Terms will be posted on the Website and become effective immediately upon posting. 
                  Your continued use of the Services constitutes acceptance of the revised Terms.
                </p>
              </div>
            </section>

            {/* 5. Registration; Wallet & Technology Requirements */}
            <section id="registration" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-orange-500/30 pb-2">
                5. Registration; Wallet & Technology Requirements
              </h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  You assume all risks associated with blockchain technology, including hardware/software failures, malicious software, and unauthorized access to your Wallet.
                </p>
              </div>
            </section>

            {/* 6. Transactions */}
            <section id="transactions" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-orange-500/30 pb-2">
                6. Transactions
              </h2>
              <div className="text-gray-300 space-y-4">
                <ul className="space-y-3">
                  <li>• All Margine-Space.com transactions are final and non-refundable.</li>
                  <li>• We do not guarantee that Margine-Space.com will appreciate in value.</li>
                  <li>• Prices may be extremely volatile and you may lose the entire value of any funds spent acquiring the digital packages.</li>
                  <li>• You are solely responsible for reporting and paying any taxes arising from your activities involving Margine-Space.com.</li>
                </ul>
              </div>
            </section>

            {/* 7. Use of Website Content */}
            <section id="content" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-orange-500/30 pb-2">
                7. Use of Website Content
              </h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  This Website exists purely for community engagement around . You do not need any special license to view, share, remix,
                  or discuss the content in a non-commercial, good-faith manner. Please avoid implying official endorsement or ownership and refrain from using
                  the  brand in any deceptive or malicious context.
                </p>
              </div>
            </section>

            {/* 8. Standards of Conduct & Compliance with Laws */}
            <section id="conduct" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-orange-500/30 pb-2">
                8. Standards of Conduct & Compliance with Laws
              </h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  You agree to comply with all applicable laws, regulations, and administrative guidance ("Applicable Laws") when using the Services,
                  including any emerging laws governing crypto assets and blockchain technology. You warrant that you will not engage in bribery, corruption,
                  money-laundering, or terrorism financing, and that you will not violate export-control or sanctions regulations.
                </p>
              </div>
            </section>

            {/* 9. Third-Party Links and Platforms */}
            <section id="third-party" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-orange-500/30 pb-2">
                9. Third-Party Links and Platforms
              </h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  The Services may include links to third-party websites or digital-asset trading platforms. We do not control, endorse, or assume any responsibility
                  for these third-party resources. Your interactions with third parties are solely between you and the third party. We disclaim all liability arising from
                  your use of third-party platforms, including any trading activity involving .
                </p>
              </div>
            </section>

            {/* 10. Forward-looking statements */}
            <section id="forward-looking" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-orange-500/30 pb-2">
                10. Forward-looking statements
              </h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  Certain statements on this Website, in our social channels, or in any materials released by the Company may constitute "forward-looking
                  statements," including—but not limited to—statements regarding future product features, listing plans, market conditions, or the performance or
                  utility of the  digital packages. These statements are based on the Company's current views and assumptions and involve
                  known and unknown risks, uncertainties, and other factors that could cause actual results to differ materially from those expressed or implied.
                </p>
                <p>
                  You must not place undue reliance on forward-looking statements. Except as required by applicable law, the Company undertakes no obligation to
                  update, revise, or correct any forward-looking statement after it is made.
                </p>
              </div>
            </section>

            {/* 11. Disclaimers */}
            <section id="disclaimers" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-orange-500/30 pb-2">
                11. Disclaimers
              </h2>
              <div className="text-gray-300 space-y-4">
                <div className="glass-modal p-4 border-l-4 border-orange-500">
                  <h3 className="text-orange-400 font-semibold mb-2">GENERAL INFORMATION ONLY — NO PROSPECTUS</h3>
                  <p className="text-sm">
                    This Website and any related  materials are provided solely for general informational purposes. They do not constitute, and may not be relied
                    upon as, a prospectus, securities offer, solicitation for investment, or promise of future performance with respect to  digital
                    packages. Nothing herein constitutes legal, financial, tax, or investment advice, and you should not act on any information without seeking
                    professional counsel.
                  </p>
                </div>
                <div className="glass-modal p-4 border-l-4 border-red-500">
                  <h3 className="text-red-400 font-semibold mb-2">NO REGULATORY APPROVAL</h3>
                  <p className="text-sm">
                    No regulatory authority has examined or approved the information on this Website, and publication of these
                    materials does not imply compliance with applicable laws, rules, or regulations.
                  </p>
                </div>
                <div className="glass-modal p-4 border-l-4 border-red-500">
                  <p className="text-red-400 font-semibold text-sm">
                    THE SERVICES AND MARGINE-SPACE.COM DIGITAL PACKAGES ARE PROVIDED "AS IS" AND "AS AVAILABLE." TO THE MAXIMUM EXTENT
                    PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES—EXPRESS, IMPLIED, OR STATUTORY—INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS
                    FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, AND FREEDOM FROM MALICIOUS CODE. WE DO NOT WARRANT THAT THE SERVICES WILL
                    BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE FROM VIRUSES; THAT DEFECTS WILL BE CORRECTED; OR THAT ANY CONTENT IS ACCURATE OR
                    RELIABLE.
                  </p>
                </div>
              </div>
            </section>

            {/* 12. Limitation of Liability */}
            <section id="liability" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-orange-500/30 pb-2">
                12. Limitation of Liability
              </h2>
              <div className="text-gray-300 space-y-4">
                <div className="glass-modal p-4 border-l-4 border-red-500">
                  <p className="text-red-400 font-semibold text-sm">
                    TO THE FULLEST EXTENT PERMITTED BY LAW, WE (AND OUR OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, PARTNERS, SERVICE PROVIDERS, AND
                    ADVISORS) SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES—
                    INCLUDING LOST PROFITS, GOODWILL, DATA, OR OTHER INTANGIBLE LOSSES—ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE
                    SERVICES OR MARGINE-SPACE.COM DIGITAL PACKAGES, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
                  </p>
                </div>
              </div>
            </section>

            {/* 13. Indemnification */}
            <section id="indemnification" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-orange-500/30 pb-2">
                13. Indemnification
              </h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  You agree to indemnify, defend, and hold harmless Margine-Space.com and its Covered Parties from and against any claims, damages, losses,
                  liabilities, costs, or expenses (including attorneys' fees) arising out of or relating to (a) your use of the Services; (b) your breach of these Terms or
                  violation of Applicable Law; or (c) your violation of any third-party rights.
                </p>
              </div>
            </section>

            {/* 14. Governing Law & Dispute Resolution */}
            <section id="governing-law" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-orange-500/30 pb-2">
                14. Governing Law & Dispute Resolution
              </h2>
              <div className="text-gray-300 space-y-4">
                <div className="glass-input p-4">
                  <h3 className="text-orange-400 font-semibold mb-2">Governing Law</h3>
                  <p className="text-sm">
                    This Agreement and any dispute or claim arising out of, or in connection with, it (including non-contractual disputes or claims) shall
                    be governed by and construed in accordance with the laws of the Hong Kong Special Administrative Region (HKSAR).
                  </p>
                </div>
                <p>
                  If an amicable settlement cannot be reached, the dispute shall be finally resolved by confidential arbitration before a neutral arbitral tribunal
                  seated in a location—and conducted under procedural rules—to be mutually agreed by the parties. The arbitration shall be conducted in
                  English, and the parties waive any right to participate in class or representative proceedings.
                </p>
                <div className="glass-modal p-4 border-l-4 border-orange-500">
                  <h3 className="text-orange-400 font-semibold mb-2">Class-Action Waiver</h3>
                  <p className="text-sm">
                    You agree to resolve disputes with us only on an individual basis and waive any right to participate in a class, consolidated,
                    or representative action.
                  </p>
                </div>
              </div>
            </section>

            {/* 15. Miscellaneous */}
            <section id="miscellaneous" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-orange-500/30 pb-2">
                15. Miscellaneous
              </h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  If any provision of these Terms is held unenforceable, the remaining provisions will remain in full force and effect. These Terms constitute the
                  entire agreement between you and us regarding the Services, superseding any prior agreements. Our failure to enforce any right or 
                  provision will not constitute a waiver. The headings in these Terms are for convenience only and have no legal effect.
                </p>
                <p>
                  These Terms may be translated. The English version prevails in the event of any conflict or ambiguity.
                </p>
                <p>
                  You may not copy, reproduce, or distribute any part of this Website or related materials without prior written consent of the Company.
                </p>
              </div>
            </section>

            {/* 16. Contact Us */}
            <section id="contact" className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-orange-500/30 pb-2">
                16. Contact Us
              </h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  If you have questions about these Terms or the Services, please email us at <a href="mailto:support@margine-space.com" className="text-orange-400 hover:text-orange-300">support@margine-space.com</a>.
                </p>
              </div>
            </section>

            {/* Footer Notice */}
            <div className="glass-modal p-6 mt-8 text-center border-t border-orange-500/30">
              <p className="text-gray-400 text-sm">
                These Terms of Service are effective as of August 2025 and will remain in effect except with respect to any changes in its provisions in the future, 
                which will be in effect immediately after being posted on this page.
              </p>
              <p className="text-orange-400 text-sm mt-2 font-semibold">
                © 2025 Margine-Space.com. All rights reserved.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}