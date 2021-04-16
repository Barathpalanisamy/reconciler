// Copyright (c) 2016, Aerele Technologies Private Limited and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["CR GSTR 2B vs PR GSTIN Matching Tool"] = {
	"filters": [
		{
			fieldname: "company",
			label: __("Company"),
			fieldtype: "Link",
			options: "Company",
			default: frappe.defaults.get_user_default("Company"),
			reqd: 1
		},
		{
			fieldname: "gst_state",
			label: __("GST State"),
			fieldtype: "Select",
			options: [
				'Andaman and Nicobar Islands',
				'Andhra Pradesh',
				'Arunachal Pradesh',
				'Assam',
				'Bihar',
				'Chandigarh',
				'Chhattisgarh',
				'Dadra and Nagar Haveli and Daman and Diu',
				'Delhi',
				'Goa',
				'Gujarat',
				'Haryana',
				'Himachal Pradesh',
				'Jammu and Kashmir',
				'Jharkhand',
				'Karnataka',
				'Kerala',
				'Ladakh',
				'Lakshadweep Islands',
				'Madhya Pradesh',
				'Maharashtra',
				'Manipur',
				'Meghalaya',
				'Mizoram',
				'Nagaland',
				'Odisha',
				'Other Territory',
				'Pondicherry',
				'Punjab',
				'Rajasthan',
				'Sikkim',
				'Tamil Nadu',
				'Telangana',
				'Tripura',
				'Uttar Pradesh',
				'Uttarakhand',
				'West Bengal'],
			reqd: 1,
			on_change: () => {
				frappe.call({
					method:"reconciler.reconciler.doctype.cd_gstr_2b_data_upload_tool.cd_gstr_2b_data_upload_tool.get_gstin_for_company",
					args:{company: frappe.query_report.get_filter_value('company'), gst_state: frappe.query_report.get_filter_value('gst_state')},
					callback: function(r){
						if (r.message){
							frappe.query_report.set_filter_value("company_gstin",r.message);
						}
						else {
							frappe.query_report.set_filter_value("company_gstin","");
						}
					}
				})
			},
		},	
		{
			fieldname: "company_gstin",
			label: __("Company GSTIN"),
			fieldtype: "Data",
			reqd: 1,
			read_only: 1
		},	
		{
			fieldname: 'based_on',
			label: __('Based On'),
			fieldtype: 'Select',
			options: ['Date', 'Return Period'],
			default: 'Date',
			reqd: 1,
			on_change: () => {
				var based_on = frappe.query_report.get_filter_value('based_on');
				if (based_on == 'Return Period'){
				frappe.call({
					method : 'reconciler.reconciler.report.cr_gstr_2b_vs_pr_gstin_matching_tool.cr_gstr_2b_vs_pr_gstin_matching_tool.return_period_query',
					freeze : true,
					callback: function(r) {
						if(r.message) {
							let return_periods = r.message
							let options = []
							for(let option of return_periods){
								options.push({
									"value":option,
									"description":""
								})
							}
							var return_period = frappe.query_report.get_filter('return_period');
							return_period.df.options = options;
							return_period.refresh();
						}
					}
				});

				}
		}
		},
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.add_months(frappe.datetime.get_today(), -1),
			depends_on:  "eval:doc.based_on == 'Date'"
		},
		{
			fieldname:"to_date",
			label: __("To Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
			depends_on:  "eval:doc.based_on == 'Date'"
		},
		{
			fieldname: "return_period",
			label: __("Return Period"),
			fieldtype: "Select",
			depends_on:  "eval:doc.based_on == 'Return Period'"
		},
		{
			fieldname: "transaction_type",
			label: __("Transaction Type"),
			fieldtype: "Select",
			options: ['','Invoice', 'CDN']
		},
		{
			fieldname: "view_type",
			label: __("View Type"),
			fieldtype: "Select",
			options: ['Supplier View', 'Document View'],
			default: 'Supplier View',
			reqd: 1
		},
		{
			fieldname: "supplier",
			label: __("Supplier"),
			fieldtype: "Link",
			options: 'Supplier',
			depends_on:  "eval:doc.view_type == 'Document View'"
		},
		{
			fieldname: "supplier_gstin",
			label: __("Supplier GSTIN"),
			fieldtype: "Data",
			depends_on:  "eval:doc.view_type == 'Document View'"
		},
		{
			fieldname: "match_status",
			label: __("Match Status"),
			fieldtype: "Select",
			options: ["","Exact Match", "Partial Match", "Probable Match", "Mismatch", "Missing in PR", "Missing in 2B"],
			depends_on:  "eval:doc.view_type == 'Document View'"
		},
		{
			fieldname: "document_status",
			label: __("Document Status"),
			fieldtype: "Select",
			options: ["","Pending", "Accepted"],
			depends_on:  "eval:doc.view_type == 'Document View'"
		}
	],
	get_datatable_options(options) {
		return Object.assign(options, {
			checkboxColumn: true
		});
	},
	onload: function(query_report) {
		query_report.page.clear_menu();
		query_report.page.add_action_item(__("⌛Pending"), () => {
			if(frappe.query_report.get_filter_value('view_type') == 'Supplier View'){
				frappe.throw(__('This action is allowed only for the document view type'));
				return;
			}
			var selected_rows = [];
		let is_selected = false;
			$('.dt-scrollable').find(":input[type=checkbox]").each((idx, row) => {
				if(row.checked){
					is_selected = true;
					selected_rows.push({'gstr_2b':frappe.query_report.data[idx]['gstr_2b']});
				}
			});
			if(is_selected == false)
			{
				frappe.throw(__("Please select rows to update status"));
				return
			}
			else{
			frappe.call('reconciler.reconciler.report.cr_gstr_2b_vs_pr_gstin_matching_tool.cr_gstr_2b_vs_pr_gstin_matching_tool.update_status', {
				data: selected_rows,
				status: 'Pending',
				freeze: true
			}).then(r => {
				frappe.msgprint(__("Status Updated"));
			});
		}
		})
		query_report.page.add_action_item(__("✔️ Accept"), () => {
			if(frappe.query_report.get_filter_value('view_type') == 'Supplier View'){
				frappe.throw(__('This action is allowed only for the document view type'));
				return;
			}
			var selected_rows = [];
			let is_selected = false;
				$('.dt-scrollable').find(":input[type=checkbox]").each((idx, row) => {
					if(row.checked){
						is_selected = true;
						selected_rows.push({'gstr_2b':frappe.query_report.data[idx]['gstr_2b']});
					}
				});
				if(is_selected == false)
				{
					frappe.throw(__("Please select rows to update status"));
					return
				}
				else{
				frappe.call('reconciler.reconciler.report.cr_gstr_2b_vs_pr_gstin_matching_tool.cr_gstr_2b_vs_pr_gstin_matching_tool.update_status', {
					data: selected_rows,
					status: 'Accepted',
					freeze: true
				}).then(r => {
					frappe.msgprint(__("Status Updated"));
				});
			}
		})
	},
	"formatter": function(value, row, column, data, default_formatter) {
		if (column.fieldname=="supplier") {
			value = data.supplier;
	
			column.link_onclick =
				"frappe.query_reports['CR GSTR 2B vs PR GSTIN Matching Tool'].apply_filters(" + JSON.stringify(data) + ")";
		}
	
		value = default_formatter(value, row, column, data);
		return value;
	},
	"apply_filters": function(data) {
		if (!data.supplier) return;
	
		frappe.route_options = {
			"company": frappe.query_report.get_filter_value('company'),
			"gst_state": frappe.query_report.get_filter_value('gst_state'),
			"company_gstin": frappe.query_report.get_filter_value('company_gstin'),
			"based_on": frappe.query_report.get_filter_value('based_on'),
			"from_date": frappe.query_report.get_filter_value('from_date'),
			"to_date": frappe.query_report.get_filter_value('to_date'),
			"return_period": frappe.query_report.get_filter_value('return_period'),
			"transaction_type" :frappe.query_report.get_filter_value('transaction_type')
		};
	
		frappe.route_options["supplier"] = data.supplier
		frappe.route_options["view_type"] = 'Document View'
	
		frappe.set_route("query-report", "CR GSTR 2B vs PR GSTIN Matching Tool");
	},
	after_datatable_render: table_instance => {
		let data = table_instance.datamanager.data;
		for (let row = 0; row < data.length; ++row) {
			if(frappe.query_report.get_filter_value('view_type') == 'Document View'){
			if (data[row]['match_status'] == 'Exact Match') {
					table_instance.style.setStyle(`.dt-row-${row} .dt-cell`, {backgroundColor: 'rgba(37,220,2,0.2);'});
				}
			if (data[row]['status'] == 'Accepted') {
				table_instance.style.setStyle(`.dt-row-${row} .dt-cell`, {backgroundColor: 'rgba(0,255,255);'});
			}
		}
		table_instance.style.setStyle(`.dt-scrollable`, {height: '600px;'});
	}
	}
}
	var render = function(tax_details, other_details, dialog) {
		let tax_details_summary = () => {
			let summary = ``
			$.each(tax_details, function(i, d) {
				summary+=`
					<tr>
						<td>${i}</td>`
				for (let key in d) {
					summary+=`
						<td>${d[key]}</td>`
				}
				summary+=`</tr>`
			});
			return `
				<div>
					<table class="table table-bordered">
						<tr>
							<th width="20%">${__('Data Source')}</th>
							<th width="10%">${__('Taxable Value')}</th>
							<th width="10%">${__('Tax Value')}</th>
							<th width="10%">${__('IGST')}</th>
							<th width="10%">${__('CGST')}</th>
							<th width="10%">${__('SGST')}</th>
							<th width="10%">${__('CESS')}</th>
						</tr>
						${summary}
					</table>
				</div>
			`;
		}
	
		let other_details_summary = () => {
			let summary = ``
			$.each(other_details, function(i, d) {
				summary+=`
					<tr>
						<td>${i}</td>`
				for (let key in d) {
					summary+=`
						<td>${d[key]}</td>`
				}
				summary+=`</tr>`
			});
			return `
				<div>
					<table class="table table-bordered">
						<tr>
							<th width="20%">${__('Data Source')}</th>
							<th width="10%">${__('Doc Link')}</th>
							<th width="10%">${__('Doc No')}</th>
							<th width="10%">${__('Date')}</th>
							<th width="10%">${__('POS')}</th>
							<th width="10%">${__('Reverse Charge')}</th>
							<th width="10%">${__('Return Period')}</th>
							<th width="10%">${__('Match Status')}</th>
							<th width="10%">${__('Reason')}</th>
							<th width="10%">${__('Docstatus')}</th>
						</tr>
						${summary}
					</table>
				</div>
			`;
		}
		let html = `
			${tax_details_summary()}
			${other_details_summary()}
		`;
	
		dialog.get_field('preview_html').html(html);
	}
	var render_summary= function(gstr2b, purchase_inv) {
		var dialog = new frappe.ui.Dialog({
			title: __("Selection Summary"),
			fields: [
				{
					"label": "Preview",
					"fieldname": "preview_html",
					"fieldtype": "HTML"
				}
			]
		});
		frappe.call('reconciler.reconciler.report.cr_gstr_2b_vs_pr_gstin_matching_tool.cr_gstr_2b_vs_pr_gstin_matching_tool.get_selection_details', {
			gstr2b: gstr2b,
			purchase_inv: purchase_inv,
			show_tax: 1,
			freeze: true
		}).then(r => {
			this.render(r.message[0], r.message[1], dialog);
		});
		dialog.get_field('preview_html').html('Loading...');
		dialog.show();
		dialog.$wrapper.find('.modal-dialog').css("width", "800px");
	}
	
	var update_status= function(gstr2b, purchase_inv) {
		var dialog = new frappe.ui.Dialog({
			title: __("Selection Summary"),
			fields: [
				{
					"label": "Preview",
					"fieldname": "preview_html",
					"fieldtype": "HTML"
				},
				{
					"label": "Action",
					"fieldname": "action",
					"fieldtype": "Select",
					"reqd": 1,
					"options": ["Pending", "Accepted"]
				}
			],
			primary_action: function() {
				frappe.call('reconciler.reconciler.report.cr_gstr_2b_vs_pr_gstin_matching_tool.cr_gstr_2b_vs_pr_gstin_matching_tool.update_status', {
					data: [{'gstr_2b': gstr2b}],
					status: dialog.fields_dict.action.value
				}).then(r => {
					frappe.msgprint(__("Status Updated"));
				});
				dialog.hide();
			},
			primary_action_label: __('Update'),
		});
		frappe.call('reconciler.reconciler.report.cr_gstr_2b_vs_pr_gstin_matching_tool.cr_gstr_2b_vs_pr_gstin_matching_tool.get_selection_details', {
			gstr2b: gstr2b,
			purchase_inv: purchase_inv,
			show_tax: 1,
			freeze: true
		}).then(r => {
			this.render(r.message[0], r.message[1], dialog);
		});
		dialog.get_field('preview_html').html('Loading...');
		dialog.show();
		dialog.$wrapper.find('.modal-dialog').css("width", "800px");
	}
	
	var create_purchase_inv= function(gstr2b, purchase_inv) {
		var dialog = new frappe.ui.Dialog({
			title: __("Selection Summary"),
			fields: [
				{
					"label": "Preview",
					"fieldname": "preview_html",
					"fieldtype": "HTML"
				}
			],
			primary_action: function() {
				frappe.call({
					method: "frappe.client.get",
					freeze: true,
					freeze_message: __("Processing..."),
					args: {
						doctype: "CD GSTR 2B Entry",
						name: gstr2b,
					},
					callback(r) {
						if(r.message) {
							var gstr2b_doc = r.message;
							if (gstr2b_doc.cf_transaction_type == 'CDN'){
								frappe.throw(__('Unable to create invoice for transaction type CDN'));
								return;
							}
							else{
								frappe.new_doc("Purchase Invoice",{"company": gstr2b_doc.cf_company,
									"bill_no" : gstr2b_doc.cf_document_number,
									"supplier" : gstr2b_doc.cf_party,
									"bill_date" : gstr2b_doc.cf_document_date,
									"reverse_charge" : gstr2b_doc.cf_reverse_charge, 
									"gst_category" : gstr2b_doc.cf_invoice_type,
									"place_of_supply" : gstr2b_doc.cf_place_of_supply,
									"grand_total" : gstr2b_doc.cf_total_amount,
									"taxes_and_charges_added" : gstr2b_doc.cf_tax_amount,
									"total" : gstr2b_doc.cf_taxable_amount,
									"supplier_gstin" : gstr2b_doc.cf_party_gstin,
									"company_gstin" :gstr2b_doc.cf_company_gstin});
							}
						}
					}
				});
				dialog.hide();
			},
			primary_action_label: __('Create')
		});
		frappe.call('reconciler.reconciler.report.cr_gstr_2b_vs_pr_gstin_matching_tool.cr_gstr_2b_vs_pr_gstin_matching_tool.get_selection_details', {
			gstr2b: gstr2b,
			purchase_inv: purchase_inv,
			show_tax: 1,
			freeze: true
		}).then(r => {
			this.render(r.message[0], r.message[1], dialog);
		});
		dialog.get_field('preview_html').html('Loading...');
		dialog.show();
		dialog.$wrapper.find('.modal-dialog').css("width", "800px");
	}	

	var unlink_pr = function(gstr2b, status) {
			if (status == 'Accepted'){
			frappe.confirm(__('This action will overwrite the status. Are you sure you want to unlink this accepted document?'),
			function() {
				frappe.call({
					method: "reconciler.reconciler.doctype.cd_gstr_2b_entry.cd_gstr_2b_entry.unlink_pr",
					freeze: true,
					freeze_message: __("Processing..."),
					args: {doc_name:gstr2b},
					callback: function(r) {
						frappe.msgprint(__("PR Unlinked successfully"))
					}
				})
			}
		);
			}
		else{
			frappe.call({
				method: "reconciler.reconciler.doctype.cd_gstr_2b_entry.cd_gstr_2b_entry.unlink_pr",
				freeze: true,
				freeze_message: __("Processing..."),
				args: {doc_name:gstr2b},
				callback: function(r) {
					frappe.msgprint(__("PR Unlinked successfully"))
				}
			})
	}
}
var get_unlinked_pr_list = function(gstr2b, from_date, to_date) {
	var dialog = new frappe.ui.Dialog({
		fields: [
			{
				label: __('Purchase Invoice'),
				fieldname: 'purchase_invoice',
				fieldtype: 'Link',
				reqd: 1,
				options: 'Purchase Invoice',
				get_query: function() {
					return {
						query: "reconciler.reconciler.report.cr_gstr_2b_vs_pr_gstin_matching_tool.cr_gstr_2b_vs_pr_gstin_matching_tool.get_unlinked_pr_list",
						filters: {
							'gstr2b': gstr2b,
							'from_date': from_date,
							'to_date': to_date
						}
					};
				}
			}
		],
		primary_action: function() {
			frappe.call('reconciler.reconciler.report.cr_gstr_2b_vs_pr_gstin_matching_tool.cr_gstr_2b_vs_pr_gstin_matching_tool.link_pr', {
				gstr2b: gstr2b,
				pr: dialog.fields_dict.purchase_invoice.value,
				freeze: true
			}).then(r => {
				frappe.msgprint(__("Linked Successfully"));
			});
			dialog.hide();
		},
		primary_action_label: __('Link'),
	});
		dialog.show();
	}