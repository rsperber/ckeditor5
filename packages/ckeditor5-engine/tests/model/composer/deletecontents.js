/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* bender-tags: model, composer */

import Document from '/ckeditor5/engine/model/document.js';
import deleteContents from '/ckeditor5/engine/model/composer/deletecontents.js';
import { setData, getData } from '/ckeditor5/engine/dev-utils/model.js';

describe( 'Delete utils', () => {
	let doc;

	beforeEach( () => {
		doc = new Document();
		doc.createRoot();

		const schema = doc.schema;

		schema.registerItem( 'image', '$inline' );
		schema.registerItem( 'paragraph', '$block' );
		schema.registerItem( 'heading1', '$block' );
		schema.registerItem( 'pchild' );

		schema.allow( { name: 'pchild', inside: 'paragraph' } );
		schema.allow( { name: '$text', inside: '$root' } );
		schema.allow( { name: 'image', inside: '$root' } );
		schema.allow( { name: '$text', attributes: [ 'bold', 'italic' ] } );
		schema.allow( { name: 'paragraph', attributes: [ 'align' ] } );
	} );

	describe( 'deleteContents', () => {
		describe( 'in simple scenarios', () => {
			test(
				'does nothing on collapsed selection',
				'f[]oo',
				'f[]oo'
			);

			test(
				'deletes single character',
				'f[o]o',
				'f[]o'
			);

			it( 'deletes single character (backward selection)' , () => {
				setData( doc, 'f[o]o', { lastRangeBackward: true } );

				deleteContents( doc.batch(), doc.selection );

				expect( getData( doc ) ).to.equal( 'f[]o' );
			} );

			test(
				'deletes whole text',
				'[foo]',
				'[]'
			);

			test(
				'deletes whole text between nodes',
				'<image></image>[foo]<image></image>',
				'<image></image>[]<image></image>'
			);

			test(
				'deletes an element',
				'x[<image></image>]y',
				'x[]y'
			);

			test(
				'deletes a bunch of nodes',
				'w[x<image></image>y]z',
				'w[]z'
			);

			test(
				'does not break things when option.merge passed',
				'w[x<image></image>y]z',
				'w[]z',
				{ merge: true }
			);
		} );

		describe( 'with text attributes', () => {
			it( 'deletes characters (first half has attrs)', () => {
				setData( doc, '<$text bold="true">fo[o</$text>b]ar', { selectionAttributes: {
					bold: true
				} } );

				deleteContents( doc.batch(), doc.selection );

				expect( getData( doc ) ).to.equal( '<$text bold="true">fo[]</$text>ar' );
				expect( doc.selection.getAttribute( 'bold' ) ).to.equal( true );
			} );

			it( 'deletes characters (2nd half has attrs)', () => {
				setData( doc, 'fo[o<$text bold="true">b]ar</$text>', { selectionAttributes: {
					bold: true
				} } );

				deleteContents( doc.batch(), doc.selection );

				expect( getData( doc ) ).to.equal( 'fo[]<$text bold="true">ar</$text>' );
				expect( doc.selection.getAttribute( 'bold' ) ).to.undefined;
			} );

			it( 'clears selection attrs when emptied content', () => {
				setData(
					doc,
					'<paragraph>x</paragraph><paragraph>[<$text bold="true">foo</$text>]</paragraph><paragraph>y</paragraph>',
					{
						selectionAttributes: {
							bold: true
						}
					}
				);

				deleteContents( doc.batch(), doc.selection );

				expect( getData( doc ) ).to.equal( '<paragraph>x</paragraph><paragraph>[]</paragraph><paragraph>y</paragraph>' );
				expect( doc.selection.getAttribute( 'bold' ) ).to.undefined;
			} );

			it( 'leaves selection attributes when text contains them', () => {
				setData( doc, '<paragraph>x<$text bold="true">a[foo]b</$text>y</paragraph>', { selectionAttributes: {
					bold: true
				} } );

				deleteContents( doc.batch(), doc.selection );

				expect( getData( doc ) ).to.equal( '<paragraph>x<$text bold="true">a[]b</$text>y</paragraph>' );
				expect( doc.selection.getAttribute( 'bold' ) ).to.equal( true );
			} );
		} );

		// Note: The algorithm does not care what kind of it's merging as it knows nothing useful about these elements.
		// In most cases it handles all elements like you'd expect to handle block elements in HTML. However,
		// in some scenarios where the tree depth is bigger results may be hard to justify. In fact, such cases
		// should not happen unless we're talking about lists or tables, but these features will need to cover
		// their scenarios themselves. In all generic scenarios elements are never nested.
		//
		// You may also be thinking – but I don't want my elements to be merged. It means that there are some special rules,
		// like – multiple editing hosts (cE=true/false in use) or block limit elements like <td>.
		// Those case should, again, be handled by their specific implementations.
		describe( 'in multi-element scenarios', () => {
			test(
				'do not merge when no need to',
				'<paragraph>x</paragraph><paragraph>[foo]</paragraph><paragraph>y</paragraph>',
				'<paragraph>x</paragraph><paragraph>[]</paragraph><paragraph>y</paragraph>',
				{ merge: true }
			);

			test(
				'merges second element into the first one (same name)',
				'<paragraph>x</paragraph><paragraph>fo[o</paragraph><paragraph>b]ar</paragraph><paragraph>y</paragraph>',
				'<paragraph>x</paragraph><paragraph>fo[]ar</paragraph><paragraph>y</paragraph>',
				{ merge: true }
			);

			test(
				'does not merge second element into the first one (same name, !option.merge)',
				'<paragraph>x</paragraph><paragraph>fo[o</paragraph><paragraph>b]ar</paragraph><paragraph>y</paragraph>',
				'<paragraph>x</paragraph><paragraph>fo[]</paragraph><paragraph>ar</paragraph><paragraph>y</paragraph>'
			);

			test(
				'merges second element into the first one (same name)',
				'<paragraph>x</paragraph><paragraph>fo[o</paragraph><paragraph>b]ar</paragraph><paragraph>y</paragraph>',
				'<paragraph>x</paragraph><paragraph>fo[]ar</paragraph><paragraph>y</paragraph>',
				{ merge: true }
			);

			test(
				'merges second element into the first one (different name)',
				'<paragraph>x</paragraph><heading1>fo[o</heading1><paragraph>b]ar</paragraph><paragraph>y</paragraph>',
				'<paragraph>x</paragraph><heading1>fo[]ar</heading1><paragraph>y</paragraph>',
				{ merge: true }
			);

			it( 'merges second element into the first one (different name, backward selection)', () => {
				setData(
					doc,
					'<paragraph>x</paragraph><heading1>fo[o</heading1><paragraph>b]ar</paragraph><paragraph>y</paragraph>',
					{ lastRangeBackward: true }
				);

				deleteContents( doc.batch(), doc.selection, { merge: true } );

				expect( getData( doc ) ).to.equal( '<paragraph>x</paragraph><heading1>fo[]ar</heading1><paragraph>y</paragraph>' );
			} );

			test(
				'merges second element into the first one (different attrs)',
				'<paragraph>x</paragraph><paragraph align="l">fo[o</paragraph><paragraph>b]ar</paragraph><paragraph>y</paragraph>',
				'<paragraph>x</paragraph><paragraph align="l">fo[]ar</paragraph><paragraph>y</paragraph>',
				{ merge: true }
			);

			test(
				'merges second element to an empty first element',
				'<paragraph>x</paragraph><heading1>[</heading1><paragraph>fo]o</paragraph><paragraph>y</paragraph>',
				'<paragraph>x</paragraph><heading1>[]o</heading1><paragraph>y</paragraph>',
				{ merge: true }
			);

			test(
				'merges elements when deep nested',
				'<paragraph>x<pchild>fo[o</pchild></paragraph><paragraph><pchild>b]ar</pchild>y</paragraph>',
				'<paragraph>x<pchild>fo[]ar</pchild>y</paragraph>',
				{ merge: true }
			);

			// For code coverage reasons.
			test(
				'merges element when selection is in two consecutive nodes even when it is empty',
				'<paragraph>foo[</paragraph><paragraph>]bar</paragraph>',
				'<paragraph>foo[]bar</paragraph>',
				{ merge: true }
			);

			// If you disagree with this case please read the notes before this section.
			test(
				'merges elements when left end deep nested',
				'<paragraph>x<pchild>fo[o</pchild></paragraph><paragraph>b]ary</paragraph>',
				'<paragraph>x<pchild>fo[]</pchild>ary</paragraph>',
				{ merge: true }
			);

			// If you disagree with this case please read the notes before this section.
			test(
				'merges elements when right end deep nested',
				'<paragraph>xfo[o</paragraph><paragraph><pchild>b]ar</pchild>y<image></image></paragraph>',
				'<paragraph>xfo[]<pchild>ar</pchild>y<image></image></paragraph>',
				{ merge: true }
			);

			test(
				'merges elements when more content in the right branch',
				'<paragraph>xfo[o</paragraph><paragraph>b]a<pchild>r</pchild>y</paragraph>',
				'<paragraph>xfo[]a<pchild>r</pchild>y</paragraph>',
				{ merge: true }
			);

			test(
				'leaves just one element when all selected',
				'<heading1>[x</heading1><paragraph>foo</paragraph><paragraph>y]</paragraph>',
				'<heading1>[]</heading1>',
				{ merge: true }
			);
		} );

		function test( title, input, output, options ) {
			it( title, () => {
				setData( doc, input );

				deleteContents( doc.batch(), doc.selection, options );

				expect( getData( doc ) ).to.equal( output );
			} );
		}
	} );
} );
